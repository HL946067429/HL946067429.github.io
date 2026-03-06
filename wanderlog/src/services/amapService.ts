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
        enableHighAccuracy: false,
        timeout: 5000,
        // Use IP positioning as fallback (very fast)
        GeoLocationFirst: false,
        useNative: true,
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
