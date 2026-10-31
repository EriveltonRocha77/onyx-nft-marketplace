import { createDb, isMockDb, type MockDb } from './db';

export const STORAGE_KEY = 'onyx:mock:v1';

export function loadDb(storage: Storage): MockDb {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createDb();
    const parsed: unknown = JSON.parse(raw);
    return isMockDb(parsed) ? parsed : createDb();
  } catch {
    return createDb();
  }
}

export function saveDb(storage: Storage, db: MockDb): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* quota ou modo privado: o estado segue só em memória */
  }
}
