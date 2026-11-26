import type { VaultFolder, VaultSession } from '../../types/longitudinal.ts';

const DB_NAME = 'prism_local_vault';
const STORE_NAME = 'sessions';
const FOLDERS_STORE = 'folders';
const DB_VERSION = 2;

const memoryVault = new Map<string, VaultSession>();
const memoryFolders = new Map<string, VaultFolder>();

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
        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
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

async function withTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => IDBRequest<T> | void,
  fallback: () => T,
): Promise<T> {
  const db = await openDb();
  if (!db) return fallback();

  return new Promise<T>((resolve) => {
    try {
      const tx = db.transaction(storeNames, mode);
      const req = run(tx);
      tx.oncomplete = () => {
        db.close();
        resolve((req ? req.result : undefined) as T);
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

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
  fallback: () => T,
): Promise<T> {
  return withTransaction(storeName, mode, (tx) => run(tx.objectStore(storeName)), fallback);
}

/** Persist or update a session strictly on-device. */
export async function saveVaultSession(session: VaultSession): Promise<void> {
  await withStore(
    STORE_NAME,
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
    STORE_NAME,
    'readonly',
    (store) => store.getAll() as IDBRequest<VaultSession[]>,
    () => Array.from(memoryVault.values()),
  );
  return [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** Delete a single session by ID from the local vault. */
export async function deleteVaultSession(id: string): Promise<void> {
  await withStore(
    STORE_NAME,
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
    STORE_NAME,
    'readwrite',
    (store) => store.clear(),
    () => {
      memoryVault.clear();
      return undefined;
    },
  );
}

/** Create a new folder strictly on-device. */
export async function createVaultFolder(name: string, color?: string): Promise<VaultFolder> {
  const folder: VaultFolder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    ...(color !== undefined ? { color } : {}),
    createdAt: new Date().toISOString(),
  };

  await withStore(
    FOLDERS_STORE,
    'readwrite',
    (store) => store.put(folder),
    () => {
      memoryFolders.set(folder.id, folder);
      return folder.id;
    },
  );

  return folder;
}

/** List all locally stored folders, sorted deterministically by createdAt ascending. */
export async function listVaultFolders(): Promise<VaultFolder[]> {
  const folders = await withStore<VaultFolder[]>(
    FOLDERS_STORE,
    'readonly',
    (store) => store.getAll() as IDBRequest<VaultFolder[]>,
    () => Array.from(memoryFolders.values()),
  );
  return [...folders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Rename an existing folder by ID if found. */
export async function renameVaultFolder(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  await withTransaction<void>(
    FOLDERS_STORE,
    'readwrite',
    (tx) => {
      const store = tx.objectStore(FOLDERS_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const existing = req.result as VaultFolder | undefined;
        if (existing) {
          store.put({ ...existing, name: trimmed });
        }
      };
    },
    () => {
      const existing = memoryFolders.get(id);
      if (existing) {
        memoryFolders.set(id, { ...existing, name: trimmed });
      }
    },
  );
}

/**
 * Delete a folder by ID and move any sessions assigned to it back to Unfiled (folderId: null)
 * so user runs are never deleted.
 */
export async function deleteVaultFolder(id: string): Promise<void> {
  await withTransaction<void>(
    [FOLDERS_STORE, STORE_NAME],
    'readwrite',
    (tx) => {
      tx.objectStore(FOLDERS_STORE).delete(id);
      const sessionsStore = tx.objectStore(STORE_NAME);
      const req = sessionsStore.getAll();
      req.onsuccess = () => {
        const sessions = (req.result as VaultSession[]) ?? [];
        for (const session of sessions) {
          if (session.folderId === id) {
            sessionsStore.put({ ...session, folderId: null });
          }
        }
      };
    },
    () => {
      memoryFolders.delete(id);
      for (const [sessionId, session] of memoryVault.entries()) {
        if (session.folderId === id) {
          memoryVault.set(sessionId, { ...session, folderId: null });
        }
      }
    },
  );
}

/** Assign a session to a folder (or null for Unfiled). */
export async function moveSessionToFolder(sessionId: string, folderId: string | null): Promise<void> {
  await withTransaction<void>(
    STORE_NAME,
    'readwrite',
    (tx) => {
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(sessionId);
      req.onsuccess = () => {
        const existing = req.result as VaultSession | undefined;
        if (existing) {
          store.put({ ...existing, folderId });
        }
      };
    },
    () => {
      const existing = memoryVault.get(sessionId);
      if (existing) {
        memoryVault.set(sessionId, { ...existing, folderId });
      }
    },
  );
}
