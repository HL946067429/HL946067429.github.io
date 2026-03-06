/**
 * Routing service using OSRM public API
 */

export async function getRoute(start: [number, number], end: [number, number], profile: string = 'driving'): Promise<[number, number][]> {
  // OSRM expects [lng, lat]
  const startLngLat = `${start[1]},${start[0]}`;
  const endLngLat = `${end[1]},${end[0]}`;
  
  // Profiles: driving, walking, cycling
  const osrmProfile = profile === 'walk' ? 'foot' : profile === 'bike' ? 'bicycle' : 'driving';
  
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLngLat};${endLngLat}?overview=full&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error('Routing request failed');
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      // Fallback to straight line if routing fails
      return [start, end];
    }
    
    // OSRM returns [lng, lat], we need [lat, lng]
    return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
  } catch (error) {
    console.error('Routing error:', error);
    return [start, end];
  }
}
