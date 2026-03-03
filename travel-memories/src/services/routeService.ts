/**
 * Route fetching service: retrieves driving/train routes from OSRM,
 * generates great circle arcs for flights, and caches results in IndexedDB.
 */

import { db } from '@/db'
import type { Place, TransportMode, RouteCache, AnimationSegment } from '@/types'
import { greatCirclePoints, calculateDistance } from '@/utils/geo'

/**
 * Fetch a driving route from the public OSRM demo server.
 * The API expects coordinates as [lng, lat].
 * Returns coordinates in [lat, lng] format and distance in meters.
 * On failure, falls back to a straight line between the two points.
 *
 * @param from - Origin place
 * @param to - Destination place
 * @returns Route coordinates ([lat, lng][]) and distance in meters
 */
export async function fetchOSRMRoute(
  from: Place,
  to: Place,
): Promise<{ coordinates: [number, number][]; distance: number }> {
  const fallback = buildStraightLine(from, to)

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=full&geometries=geojson`

    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`OSRM request failed with status ${response.status}, using fallback`)
      return fallback
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('OSRM returned no valid routes, using fallback')
      return fallback
    }

    const route = data.routes[0]
    const geojsonCoords: [number, number][] = route.geometry.coordinates

    // OSRM GeoJSON returns [lng, lat], convert to [lat, lng]
    const coordinates: [number, number][] = geojsonCoords.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    )

    const distance: number = route.distance ?? calculateDistance(
      [from.latitude, from.longitude],
      [to.latitude, to.longitude],
    )

    return { coordinates, distance }
  } catch (error) {
    console.warn('OSRM fetch error, using fallback:', error)
    return fallback
  }
}

/**
 * Build a straight-line fallback between two places.
 */
function buildStraightLine(
  from: Place,
  to: Place,
): { coordinates: [number, number][]; distance: number } {
  const coordinates: [number, number][] = [
    [from.latitude, from.longitude],
    [to.latitude, to.longitude],
  ]
  const distance = calculateDistance(
    [from.latitude, from.longitude],
    [to.latitude, to.longitude],
  )
  return { coordinates, distance }
}

/**
 * Get a route between two places, using cache when available.
 *
 * - For driving/train: calls OSRM
 * - For flight: generates a great circle arc
 * - Results are cached in the routeCache table for subsequent lookups
 *
 * @param from - Origin place (must have an id)
 * @param to - Destination place (must have an id)
 * @param mode - Transport mode
 * @returns Route coordinates ([lat, lng][]) and distance in meters
 */
export async function getRoute(
  from: Place,
  to: Place,
  mode: TransportMode,
): Promise<{ coordinates: [number, number][]; distance: number }> {
  // Check cache first
  if (from.id !== undefined && to.id !== undefined) {
    try {
      const cached = await db.routeCache
        .where('[fromPlaceId+toPlaceId+transportMode]')
        .equals([from.id, to.id, mode])
        .first()

      if (cached) {
        return {
          coordinates: cached.coordinates,
          distance: cached.distanceMeters,
        }
      }
    } catch (error) {
      console.warn('Route cache lookup failed:', error)
    }
  }

  // Fetch the route based on transport mode
  let result: { coordinates: [number, number][]; distance: number }

  if (mode === 'flight') {
    const fromCoord: [number, number] = [from.latitude, from.longitude]
    const toCoord: [number, number] = [to.latitude, to.longitude]
    const coordinates = greatCirclePoints(fromCoord, toCoord, 100)
    const distance = calculateDistance(fromCoord, toCoord)
    result = { coordinates, distance }
  } else {
    // driving or train - both use road routing as an approximation
    result = await fetchOSRMRoute(from, to)
  }

  // Cache the result
  if (from.id !== undefined && to.id !== undefined) {
    try {
      const cacheEntry: RouteCache = {
        fromPlaceId: from.id,
        toPlaceId: to.id,
        transportMode: mode,
        coordinates: result.coordinates,
        distanceMeters: result.distance,
      }
      await db.routeCache.add(cacheEntry)
    } catch (error) {
      console.warn('Failed to cache route:', error)
    }
  }

  return result
}

/**
 * Build animation segments for a sequence of places.
 * Each consecutive pair of places becomes a segment with proportional
 * start/end progress values based on distance.
 *
 * @param places - Ordered array of places to route between
 * @returns Array of AnimationSegment with proportional progress values
 */
export async function buildAnimationSegments(places: Place[]): Promise<AnimationSegment[]> {
  if (places.length < 2) {
    return []
  }

  // Fetch routes for each consecutive pair
  const routePromises: Promise<{
    from: Place
    to: Place
    coordinates: [number, number][]
    distance: number
  }>[] = []

  for (let i = 0; i < places.length - 1; i++) {
    const from = places[i]
    const to = places[i + 1]
    const mode = to.transportMode

    routePromises.push(
      getRoute(from, to, mode).then((route) => ({
        from,
        to,
        coordinates: route.coordinates,
        distance: route.distance,
      })),
    )
  }

  const routes = await Promise.all(routePromises)

  // Calculate total distance for proportional progress assignment
  const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0)

  if (totalDistance === 0) {
    // Equal distribution when all distances are zero
    const equalShare = 1 / routes.length
    return routes.map((route, i) => ({
      fromPlace: route.from,
      toPlace: route.to,
      transportMode: route.to.transportMode,
      coordinates: route.coordinates,
      distanceMeters: route.distance,
      startProgress: i * equalShare,
      endProgress: (i + 1) * equalShare,
    }))
  }

  // Assign proportional start/end progress
  const segments: AnimationSegment[] = []
  let cumulativeProgress = 0

  for (const route of routes) {
    const progressShare = route.distance / totalDistance
    const startProgress = cumulativeProgress
    const endProgress = cumulativeProgress + progressShare

    segments.push({
      fromPlace: route.from,
      toPlace: route.to,
      transportMode: route.to.transportMode,
      coordinates: route.coordinates,
      distanceMeters: route.distance,
      startProgress,
      endProgress,
    })

    cumulativeProgress = endProgress
  }

  // Ensure the last segment ends exactly at 1.0 to avoid floating point drift
  if (segments.length > 0) {
    segments[segments.length - 1].endProgress = 1
  }

  return segments
}
