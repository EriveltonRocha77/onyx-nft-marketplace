import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import type { RealtimeEvent } from '../../shared/api/schemas';
import { onDomainEvent, type DomainEvent } from '../domain/events';
import { getDb } from '../store';

/**
 * O MSW remove o prefixo "/socket.io/" do caminho antes de comparar com a URL do handler;
 * por isso o link casa qualquer WebSocket e o filtro por caminho é feito no listener.
 */
const link = ws.link('*');

const PING_INTERVAL_MS = 20_000;

interface ClientEntry {
  userId: string | null;
  emit(event: string, payload: unknown): void;
  close(): void;
}

const clients = new Set<ClientEntry>();
let blocked = false;

function userFromToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const s = getDb().sessions[token];
  if (!s || s.expired || new Date(s.expiresAt).getTime() < Date.now()) return null;
  return s.userId;
}

export const socketHandler = link.addEventListener('connection', (connection) => {
  // Outros WebSockets (ex.: HMR do Vite em desenvolvimento) seguem para o servidor real.
  if (!new URL(connection.client.url).pathname.startsWith('/socket.io')) {
    connection.server.connect();
    return;
  }
  if (blocked) {
    // Servidor indisponível: o upgrade é aceito, mas o handshake nunca chega.
    // O cliente descarta a tentativa pelo timeout de conexão e tenta de novo (ver createSocket).
    return;
  }
  let io: ReturnType<typeof toSocketIo> | null = null;
  const entry: ClientEntry = {
    userId: null,
    emit: (event, payload) => io?.client.emit(event, payload),
    close: () => connection.client.close(1006, 'desconexão simulada'),
  };
  clients.add(entry);

  // toSocketIo envia o handshake Engine.IO/Socket.IO ao ser chamado. Se isso acontecesse
  // antes do evento "open" do cliente, a mensagem seria perdida; por isso adiamos a chamada.
  const bind = setTimeout(() => {
    io = toSocketIo(connection);
  }, 10);

  // Engine.IO: o servidor precisa enviar pings; o cliente responde "3".
  const ping = setInterval(() => {
    try { connection.client.send('2'); } catch { /* conexão encerrada */ }
  }, PING_INTERVAL_MS);

  connection.client.addEventListener('message', (event) => {
    const data = event.data;
    // Pacote CONNECT do Socket.IO ("40" + JSON de auth): identifica o usuário da sessão.
    if (typeof data === 'string' && data.startsWith('40')) {
      try {
        const auth = JSON.parse(data.slice(2) || '{}') as { token?: unknown };
        entry.userId = userFromToken(auth.token);
      } catch {
        entry.userId = null;
      }
    }
  });

  connection.client.addEventListener('close', () => {
    clearTimeout(bind);
    clearInterval(ping);
    clients.delete(entry);
  });
});

/**
 * Entrega um evento a clientes reais do socket.io-client. `userId: null` no envelope = difusão.
 * Com `force`, ignora o filtro por usuário (usado só para testar o descarte no cliente).
 */
export function emitToUser(event: RealtimeEvent, force = false): number {
  let delivered = 0;
  for (const c of clients) {
    if (!force && event.userId !== null && c.userId !== event.userId) continue;
    c.emit(event.type, event);
    delivered += 1;
  }
  return delivered;
}

export function connectedClients(): { userId: string | null }[] {
  return [...clients].map((c) => ({ userId: c.userId }));
}

/** Derruba as conexões abertas. Com `block`, novas tentativas também falham até `allowConnections()`. */
export function disconnectAll(block = false): void {
  blocked = block;
  for (const c of [...clients]) c.close();
}

export function allowConnections(): void {
  blocked = false;
}

/** Monta o envelope versionado a partir do estado atual. O id é estável: o mesmo estado gera o mesmo id. */
export function envelopeFor(e: DomainEvent): RealtimeEvent | null {
  const db = getDb();
  const occurredAt = new Date().toISOString();
  if (e.kind === 'nft') {
    const nft = db.nfts.find((n) => n.id === e.nftId);
    if (!nft) return null;
    return { id: `evt_nft_${nft.id}_v${nft.version}`, type: 'nft.updated', resource: { kind: 'nft', id: nft.id }, version: nft.version, occurredAt, userId: null, payload: { nft } };
  }
  const order = db.orders[e.orderId];
  if (!order) return null;
  return {
    id: `evt_order_${order.id}_v${order.version}`, type: 'order.updated', resource: { kind: 'order', id: order.id }, version: order.version,
    occurredAt, userId: order.userId, payload: { status: order.status, declineReason: order.declineReason },
  };
}

/** Todo evento de domínio vira um evento Socket.IO — o mesmo estado que o REST devolve. */
onDomainEvent((e) => {
  const env = envelopeFor(e);
  if (env) emitToUser(env);
});
