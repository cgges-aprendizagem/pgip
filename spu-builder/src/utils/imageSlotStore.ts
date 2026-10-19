const LEGACY_SLOT_KEY = 'spu_image_slots';
const DB_NAME = 'spu_builder_assets';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const SLOT_RECORD = 'image_slots';

let cached: string | null = null;
let database: Promise<IDBDatabase> | null = null;

function normalize(content: string | null | undefined): string {
  try {
    const parsed = JSON.parse(content || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? JSON.stringify(parsed)
      : '{}';
  } catch {
    return '{}';
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento de imagens.'));
  });
  return database;
}

async function readDatabase(): Promise<string | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SLOT_RECORD);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => reject(request.error || new Error('Não foi possível ler as imagens.'));
  });
}

async function writeDatabase(content: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(content, SLOT_RECORD);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Não foi possível salvar as imagens.'));
    transaction.onabort = () => reject(transaction.error || new Error('O salvamento das imagens foi interrompido.'));
  });
}

async function deleteDatabaseRecord(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(SLOT_RECORD);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Não foi possível limpar as imagens.'));
    transaction.onabort = () => reject(transaction.error || new Error('A limpeza das imagens foi interrompida.'));
  });
}

function liveSnapshot(): string | null {
  try {
    return window.__SPU_IMAGE_SLOT_RUNTIME?.snapshot() || null;
  } catch {
    return null;
  }
}

export async function readImageSlots(options: { preferLive?: boolean } = {}): Promise<string> {
  if (options.preferLive !== false) {
    const live = liveSnapshot();
    if (live) return normalize(live);
  }
  if (cached !== null) return cached;

  const legacy = normalize(localStorage.getItem(LEGACY_SLOT_KEY));
  try {
    const stored = await readDatabase();
    if (stored !== null) {
      cached = normalize(stored);
      return cached;
    }
    cached = legacy;
    await writeDatabase(cached);
    return cached;
  } catch {
    cached = legacy;
    return cached;
  }
}

export async function writeImageSlots(content: string): Promise<void> {
  const normalized = normalize(content);
  cached = normalized;
  try {
    await writeDatabase(normalized);
    // A cópia antiga deixa de ser necessária e poderia estourar a cota curta
    // do localStorage. A leitura ainda migra instalações anteriores.
    localStorage.removeItem(LEGACY_SLOT_KEY);
  } catch {
    // Fallback para navegadores que bloqueiem IndexedDB.
    localStorage.setItem(LEGACY_SLOT_KEY, normalized);
  }
}

export async function replaceImageSlots(content: string): Promise<void> {
  const normalized = normalize(content);
  window.__SPU_IMAGE_SLOT_RUNTIME?.replace(normalized);
  await writeImageSlots(normalized);
}

export async function clearImageSlots(): Promise<void> {
  cached = '{}';
  window.__SPU_IMAGE_SLOT_RUNTIME?.clear();
  localStorage.removeItem(LEGACY_SLOT_KEY);
  try {
    await deleteDatabaseRecord();
  } catch {
    // O runtime e o fallback local já foram limpos.
  }
}
