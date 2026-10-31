import type { MockDb } from './store';
import { updateNft, type NftPatch } from './domain/catalog';
import { clearOrderTimers, resolveOrder } from './domain/orders';
import { allowConnections, connectedClients, disconnectAll, emitToUser, envelopeFor } from './socket/handler';
import { getDb, mutate, resetDb } from './store';
import { delayNext, failNext, setLatency, setScenario } from './scenarios/engine';
import type { FailureResponse, LatencyRule, ScenarioConfig, ScenarioName } from './scenarios/types';

export interface MockControl {
  setScenario(nameOrConfig: ScenarioName | Partial<ScenarioConfig>): void;
  reset(scenario?: ScenarioName): void;
  setLatency(rule: LatencyRule): void;
  delayNext(matcher: string, ms: number): void;
  failNext(matcher: string, response: FailureResponse): void;
  expireSession(): void;
  /** Altera preço/estoque de um NFT; o evento `nft.updated` segue pelo socket real. */
  mutateNft(nftId: string, patch: NftPatch): void;
  /** Reenvia o evento do estado atual do recurso (duplicata, se já enviado). */
  emitCurrent(kind: 'nft' | 'order', id: string): void;
  /** Envia um envelope arbitrário (evento antigo, de outro usuário…). `force` ignora o filtro do servidor. */
  emitRaw(event: unknown, opts?: { force?: boolean }): number;
  /** Derruba as conexões do socket; com `block`, impede reconexão até `reconnectSocket()`. */
  disconnectSocket(opts?: { block?: boolean }): void;
  reconnectSocket(): void;
  socketClients(): { userId: string | null }[];
  /** Resolve agora um pedido pendente, com o resultado indicado. */
  resolveOrder(orderId: string, outcome?: 'confirmed' | 'declined'): void;
  getState(): Readonly<MockDb>;
}

export const mockControl: MockControl = {
  setScenario,
  reset(scenario = 'default') {
    clearOrderTimers();
    resetDb();
    setScenario(scenario);
  },
  setLatency,
  delayNext,
  failNext,
  expireSession() {
    mutate((db) => {
      for (const s of Object.values(db.sessions)) s.expired = true;
    });
  },
  mutateNft(nftId, patch) { updateNft(nftId, patch); },
  emitCurrent(kind, id) {
    const env = envelopeFor(kind === 'nft' ? { kind: 'nft', nftId: id } : { kind: 'order', orderId: id, userId: getDb().orders[id]?.userId ?? '' });
    if (env) emitToUser(env);
  },
  emitRaw(event, opts) { return emitToUser(event as Parameters<typeof emitToUser>[0], opts?.force ?? false); },
  disconnectSocket(opts) { disconnectAll(opts?.block ?? false); },
  reconnectSocket() { allowConnections(); },
  socketClients: () => connectedClients(),
  resolveOrder(orderId, outcome) {
    if (outcome) mutate((db) => { const o = db.orders[orderId]; if (o) o.outcome = outcome; });
    resolveOrder(orderId);
  },
  getState: () => getDb(),
};
