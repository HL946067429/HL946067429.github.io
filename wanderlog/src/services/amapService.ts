/**
 * Gaode (AMap) location & reverse geocoding service.
 *
 * Uses the Web JS API 2.0 which provides:
 *  - IP-based positioning (instant, ~city level)
 *  - Browser geolocation with Gaode's service (much faster than raw
 *    navigator.geolocation in China because it doesn't depend on Google)
 *  - Reverse geocoding (coordinates -> Chinese address)
 *
 * Get a free key at https://lbs.amap.com  (Web端 JS API Key)
 */

// ---- Put your key here or set VITE_AMAP_KEY in .env.local ----
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined;

let sdkReady: Promise<void> | null = null;

/** Dynamically load the AMap JS SDK once */
function loadSdk(): Promise<void> {
  if (!AMAP_KEY) return Promise.reject(new Error('No AMap key'));
  if (sdkReady) return sdkReady;

  sdkReady = new Promise((resolve, reject) => {
    // Callback name used by AMap loader
    const cbName = '_amap_init_' + Date.now();
    (window as any)[cbName] = () => {
      delete (window as any)[cbName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&callback=${cbName}`;
    script.onerror = () => {
      sdkReady = null;
      reject(new Error('AMap SDK load failed'));
    };
    document.head.appendChild(script);
  });

  return sdkReady;
}

declare const AMap: any;

export interface AMapLocation {
  latitude: number;
  longitude: number;
  address: string;
}

/**
 * Get current position using AMap Geolocation plugin.
 * Falls back to IP positioning if browser geolocation fails.
 * Typically returns within 1-3 seconds in China.
 */
export async function getAMapLocation(): Promise<AMapLocation> {
  await loadSdk();

  return new Promise((resolve, reject) => {
    AMap.plugin('AMap.Geolocation', () => {
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 8000,
        // Try browser GPS first, fall back to IP if denied/timeout
        GeoLocationFirst: true,
        useNative: true,
        maximumAge: 60000,
      });

      geo.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          resolve({
            latitude: result.position.getLat(),
            longitude: result.position.getLng(),
            address: result.formattedAddress || `${result.position.getLat().toFixed(4)}, ${result.position.getLng().toFixed(4)}`,
          });
        } else {
          // Fallback: IP-based city-level positioning
          geo.getCityInfo((status2: string, result2: any) => {
            if (status2 === 'complete' && result2.center) {
              resolve({
                latitude: result2.center[1],
                longitude: result2.center[0],
                address: result2.city || '当前城市',
              });
            } else {
              reject(new Error('AMap geolocation failed'));
            }
          });
        }
      });
    });
  });
}

/**
 * Get location using native browser Geolocation API.
 * Works everywhere (overseas), triggers the browser permission prompt.
 */
export async function getBrowserLocation(): Promise<AMapLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        resolve({ latitude, longitude, address });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

/** Cached permission state */
let permissionGranted = false;

/**
 * Pre-request location permission on app load.
 * This way when user taps "check-in", no permission popup blocks the flow.
 */
export async function preRequestLocationPermission(): Promise<void> {
  if (permissionGranted) return;

  // Check permission state without triggering a prompt (Permissions API)
  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'granted') {
        permissionGranted = true;
        return;
      }
      if (status.state === 'denied') return; // Don't bother asking
    } catch { /* Permissions API not supported, proceed */ }
  }

  // Trigger the permission prompt with a quick low-accuracy request
  try {
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => { permissionGranted = true; resolve(); },
        () => resolve(), // denied is ok, we tried
        { enableHighAccuracy: false, timeout: 3000, maximumAge: Infinity }
      );
    });
  } catch { /* ignore */ }
}

/**
 * Reverse geocode: coordinates -> address string.
 * Uses AMap REST API (faster than loading the full Geocoder plugin).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!AMAP_KEY) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lng},${lat}&key=${AMAP_KEY}&radius=200`,
      { signal: controller.signal },
    );
    clearTimeout(tid);

    const data = await res.json();
    if (data.status === '1' && data.regeocode) {
      const addr = data.regeocode.formatted_address;
      // Return a short version: just the POI or road name
      const poi = data.regeocode.pois?.[0]?.name;
      const road = data.regeocode.addressComponent?.street;
      return poi || road || addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch { /* ignore */ }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Whether AMap service is available (key configured) */
export function isAMapAvailable(): boolean {
  return !!AMAP_KEY;
}
