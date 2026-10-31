import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import type { RealtimeEvent } from '../../shared/api/schemas';
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
    connection.client.close(1011, 'indisponível');
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

/** Entrega um evento a clientes reais do socket.io-client. `userId: null` no envelope = difusão. */
export function emitToUser(event: RealtimeEvent): number {
  let delivered = 0;
  for (const c of clients) {
    if (event.userId !== null && c.userId !== event.userId) continue;
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
