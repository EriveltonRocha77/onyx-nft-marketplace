import { createDb, type MockDb } from './db';
import { STORAGE_KEY, loadDb, saveDb } from './persistence';

export * from './db';
export { STORAGE_KEY, loadDb, saveDb };

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

let current: MockDb | null = null;

export function getDb(): MockDb {
  if (!current) {
    const s = storage();
    current = s ? loadDb(s) : createDb();
  }
  return current;
}

export function mutate<T>(fn: (db: MockDb) => T): T {
  const db = getDb();
  const result = fn(db);
  const s = storage();
  if (s) saveDb(s, db);
  return result;
}

export function resetDb(): void {
  current = createDb();
  const s = storage();
  if (s) saveDb(s, current);
}

/** Descarta o cache em memória e relê do storage (útil em testes). */
export function reloadDb(): void {
  current = null;
}
