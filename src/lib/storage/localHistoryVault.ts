import type { VaultSession } from '../../types/longitudinal.ts';

const DB_NAME = 'prism_local_vault';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

const memoryVault = new Map<string, VaultSession>();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
  fallback: () => T,
): Promise<T> {
  const db = await openDb();
  if (!db) return fallback();

  return new Promise<T>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const req = run(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => {
        db.close();
        resolve(req.result);
      };
      tx.onerror = () => {
        db.close();
        resolve(fallback());
      };
      tx.onabort = () => {
        db.close();
        resolve(fallback());
      };
    } catch {
      db.close();
      resolve(fallback());
    }
  });
}

/** Persist or update a session strictly on-device. */
export async function saveVaultSession(session: VaultSession): Promise<void> {
  await withStore(
    'readwrite',
    (store) => store.put(session),
    () => {
      memoryVault.set(session.id, session);
      return session.id;
    },
  );
}

/** List all locally stored sessions, sorted newest-first by timestamp. */
export async function listVaultSessions(): Promise<VaultSession[]> {
  const sessions = await withStore<VaultSession[]>(
    'readonly',
    (store) => store.getAll() as IDBRequest<VaultSession[]>,
    () => Array.from(memoryVault.values()),
  );
  return [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** Delete a single session by ID from the local vault. */
export async function deleteVaultSession(id: string): Promise<void> {
  await withStore(
    'readwrite',
    (store) => store.delete(id),
    () => {
      memoryVault.delete(id);
      return undefined;
    },
  );
}

/** Remove all sessions from the local vault. */
export async function clearVaultSessions(): Promise<void> {
  await withStore(
    'readwrite',
    (store) => store.clear(),
    () => {
      memoryVault.clear();
      return undefined;
    },
  );
}
