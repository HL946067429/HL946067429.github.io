/**
 * IndexedDB-based persistent storage for trip data.
 * Stores full trip array including base64 photo data.
 *
 * Also supports auto-sync to a local JSON file via File System Access API.
 */

const DB_NAME = 'wanderlog';
const DB_VERSION = 2;
const STORE_NAME = 'appdata';
const TRIPS_KEY = 'trips';
const FILE_HANDLE_KEY = 'syncFileHandle';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- Trip data CRUD ----

export async function loadTrips<T>(): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(TRIPS_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveTrips<T>(data: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, TRIPS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silent fail
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silent fail
  }
}

// ---- File System Access API: auto-sync to local JSON file ----

/** Check if browser supports File System Access API */
export function isFileSyncSupported(): boolean {
  return 'showSaveFilePicker' in window;
}

/** Store file handle in IndexedDB for reuse across sessions */
async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, FILE_HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* ignore */ }
}

/** Load previously saved file handle */
async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(FILE_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Remove saved file handle */
async function removeFileHandle(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(FILE_HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* ignore */ }
}

/** Write JSON data to a file handle */
async function writeToFile(handle: FileSystemFileHandle, data: unknown): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

/**
 * Let user pick a JSON file to sync to.
 * Returns the file handle or null if cancelled.
 */
export async function pickSyncFile(): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'wanderlog-data.json',
      types: [{
        description: 'JSON 文件',
        accept: { 'application/json': ['.json'] },
      }],
    });
    await saveFileHandle(handle);
    return handle;
  } catch {
    return null; // user cancelled
  }
}

/**
 * Try to restore a previously configured sync file.
 * Returns the handle if permission is still valid, null otherwise.
 */
export async function restoreSyncFile(): Promise<FileSystemFileHandle | null> {
  const handle = await loadFileHandle();
  if (!handle) return null;

  try {
    // Check if we still have permission
    const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;

    // Try to re-request (only works with user gesture, so just return null)
    return null;
  } catch {
    return null;
  }
}

/**
 * Re-request permission for a previously saved file handle.
 * Must be called from a user gesture (button click).
 */
export async function reauthorizeSyncFile(): Promise<FileSystemFileHandle | null> {
  const handle = await loadFileHandle();
  if (!handle) return null;

  try {
    const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') return handle;
  } catch { /* ignore */ }
  return null;
}

/** Stop syncing and remove saved file handle */
export async function disableFileSync(): Promise<void> {
  await removeFileHandle();
}

/** Sync trip data to the file handle */
export async function syncToFile(handle: FileSystemFileHandle, data: unknown): Promise<boolean> {
  try {
    await writeToFile(handle, data);
    return true;
  } catch {
    return false;
  }
}
