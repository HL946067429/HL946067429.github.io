/**
 * Nominatim geocoding service for reverse geocoding and place search.
 * Respects Nominatim's usage policy of 1 request per second.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'TravelMemories/1.0'
const MIN_REQUEST_INTERVAL_MS = 1000

/** Timestamp of the last Nominatim request, used for throttling. */
let lastRequestTime = 0

/**
 * Enforce Nominatim's 1-request-per-second policy by waiting if needed.
 */
async function throttle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

/**
 * Reverse geocode a latitude/longitude pair into a human-readable address.
 * Uses the Nominatim reverse geocoding API with Chinese language preference.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns A display name string, or a coordinate fallback on error
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    await throttle()

    const url =
      `${NOMINATIM_BASE}/reverse?` +
      `lat=${encodeURIComponent(lat)}&` +
      `lon=${encodeURIComponent(lng)}&` +
      `format=json&` +
      `accept-language=zh`

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    if (!response.ok) {
      console.warn(`Nominatim reverse geocode failed with status ${response.status}`)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }

    const data = await response.json()

    if (data.display_name) {
      return data.display_name
    }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch (error) {
    console.warn('Reverse geocode error:', error)
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

/**
 * Search for places matching a query string.
 * Uses the Nominatim search API with Chinese language preference, limited to 5 results.
 *
 * @param query - The search query (e.g. city name, address, landmark)
 * @returns Array of matching places with name, lat, and lng
 */
export async function searchPlace(
  query: string,
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  try {
    await throttle()

    const url =
      `${NOMINATIM_BASE}/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `limit=5&` +
      `accept-language=zh`

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    if (!response.ok) {
      console.warn(`Nominatim search failed with status ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
  } catch (error) {
    console.warn('Place search error:', error)
    return []
  }
}
