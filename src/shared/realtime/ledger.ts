import type { RealtimeEvent } from '../api/schemas';

/**
 * Registro de eventos já tratados. Rejeita duplicatas (mesmo id) e eventos antigos
 * (versão menor ou igual à última aceita para o mesmo recurso), sem crescer indefinidamente.
 */
export function createLedger(maxIds = 500, maxResources = 2000) {
  const ids = new Set<string>();
  const versions = new Map<string, number>();

  const trim = <T>(c: Set<T> | Map<T, unknown>, max: number) => {
    while (c.size > max) c.delete(c.keys().next().value as T);
  };

  return {
    /** `true` quando o evento deve ser aplicado. */
    accept(event: Pick<RealtimeEvent, 'id' | 'version' | 'resource'>): boolean {
      if (ids.has(event.id)) return false;
      ids.add(event.id);
      trim(ids, maxIds);
      const key = `${event.resource.kind}:${event.resource.id}`;
      const last = versions.get(key) ?? 0;
      if (event.version <= last) return false;
      versions.delete(key);
      versions.set(key, event.version);
      trim(versions, maxResources);
      return true;
    },
    size: () => ids.size,
  };
}
export type Ledger = ReturnType<typeof createLedger>;
