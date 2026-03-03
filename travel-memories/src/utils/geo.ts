/**
 * Geographic utility functions for great circle calculations, distance,
 * interpolation, and bounding box computation.
 *
 * All coordinates are in [latitude, longitude] format.
 */

const EARTH_RADIUS_METERS = 6_371_000

/**
 * Convert degrees to radians.
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Convert radians to degrees.
 */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/**
 * Generate points along a great circle arc between two [lat, lng] coordinates
 * using spherical linear interpolation (slerp).
 * @param from - Starting point [lat, lng]
 * @param to - Ending point [lat, lng]
 * @param numPoints - Number of points to generate (default 100)
 * @returns Array of [lat, lng] points along the arc
 */
export function greatCirclePoints(
  from: [number, number],
  to: [number, number],
  numPoints: number = 100,
): [number, number][] {
  const lat1 = toRad(from[0])
  const lng1 = toRad(from[1])
  const lat2 = toRad(to[0])
  const lng2 = toRad(to[1])

  // Angular distance between the two points
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    )

  // If points are essentially the same, return a straight set
  if (d < 1e-10) {
    return Array.from({ length: numPoints }, () => [from[0], from[1]] as [number, number])
  }

  const points: [number, number][] = []

  for (let i = 0; i < numPoints; i++) {
    const f = i / (numPoints - 1)

    // Spherical interpolation factors
    const a = Math.sin((1 - f) * d) / Math.sin(d)
    const b = Math.sin(f * d) / Math.sin(d)

    // Cartesian coordinates of the interpolated point
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2)
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2)
    const z = a * Math.sin(lat1) + b * Math.sin(lat2)

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lng = Math.atan2(y, x)

    points.push([toDeg(lat), toDeg(lng)])
  }

  return points
}

/**
 * Calculate the great-circle distance between two [lat, lng] points
 * using the Haversine formula.
 * @param from - Starting point [lat, lng]
 * @param to - Ending point [lat, lng]
 * @returns Distance in meters
 */
export function calculateDistance(from: [number, number], to: [number, number]): number {
  const lat1 = toRad(from[0])
  const lat2 = toRad(to[0])
  const dLat = toRad(to[0] - from[0])
  const dLng = toRad(to[1] - from[1])

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}

/**
 * Given a polyline (array of [lat, lng]) and a progress value between 0 and 1,
 * return the interpolated position and bearing angle (in degrees, 0 = north, clockwise).
 * @param coords - Array of [lat, lng] points forming a polyline
 * @param progress - A value from 0 to 1 representing how far along the polyline
 * @returns The interpolated position and bearing in degrees
 */
export function interpolatePosition(
  coords: [number, number][],
  progress: number,
): { position: [number, number]; bearing: number } {
  if (coords.length === 0) {
    return { position: [0, 0], bearing: 0 }
  }

  if (coords.length === 1) {
    return { position: coords[0], bearing: 0 }
  }

  // Clamp progress
  const clampedProgress = Math.max(0, Math.min(1, progress))

  // Calculate cumulative distances along the polyline
  const segmentDistances: number[] = []
  let totalDistance = 0

  for (let i = 1; i < coords.length; i++) {
    const dist = calculateDistance(coords[i - 1], coords[i])
    segmentDistances.push(dist)
    totalDistance += dist
  }

  // Handle zero-length polyline
  if (totalDistance === 0) {
    return { position: coords[0], bearing: 0 }
  }

  const targetDistance = clampedProgress * totalDistance
  let accumulated = 0

  for (let i = 0; i < segmentDistances.length; i++) {
    const segDist = segmentDistances[i]

    if (accumulated + segDist >= targetDistance) {
      // Interpolate within this segment
      const segProgress = segDist > 0 ? (targetDistance - accumulated) / segDist : 0
      const from = coords[i]
      const to = coords[i + 1]

      const lat = from[0] + (to[0] - from[0]) * segProgress
      const lng = from[1] + (to[1] - from[1]) * segProgress

      const bearing = calculateBearing(from, to)

      return { position: [lat, lng], bearing }
    }

    accumulated += segDist
  }

  // At the very end
  const lastIdx = coords.length - 1
  const bearing = calculateBearing(coords[lastIdx - 1], coords[lastIdx])
  return { position: coords[lastIdx], bearing }
}

/**
 * Calculate the initial bearing from point A to point B.
 * @param from - Starting point [lat, lng]
 * @param to - Ending point [lat, lng]
 * @returns Bearing in degrees (0-360, 0 = north, clockwise)
 */
function calculateBearing(from: [number, number], to: [number, number]): number {
  const lat1 = toRad(from[0])
  const lat2 = toRad(to[0])
  const dLng = toRad(to[1] - from[1])

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  const bearing = toDeg(Math.atan2(y, x))

  // Normalize to 0-360
  return (bearing + 360) % 360
}

/**
 * Compute the bounding box for a set of [lat, lng] coordinates.
 * @param coords - Array of [lat, lng] points
 * @returns [southWest, northEast] where each is [lat, lng]
 */
export function getBounds(
  coords: [number, number][],
): [[number, number], [number, number]] {
  if (coords.length === 0) {
    return [
      [0, 0],
      [0, 0],
    ]
  }

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}
