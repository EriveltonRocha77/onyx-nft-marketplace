import type { QueryClient } from '@tanstack/react-query';
import { getToken } from '../../features/auth/session';
import { realtimeEventSchema } from '../api/schemas';
import { applyEvent, reconcile } from './applyEvent';
import { createLedger } from './ledger';
import { createSocket } from './socket';
import { setRealtimeStatus } from './status';

/**
 * Abre a conexão Socket.IO de uma sessão. `userId` é `null` para visitantes (só eventos públicos).
 * O retorno encerra a conexão e todos os listeners; depois disso nenhum evento é aplicado.
 */
export function connectRealtime(qc: QueryClient, opts: { url?: string; userId: string | null }): () => void {
  const { userId } = opts;
  const ledger = createLedger();
  let active = true;
  let wasConnected = false;
  const socket = createSocket({ ...(opts.url ? { url: opts.url } : {}), getToken });
  setRealtimeStatus('connecting');

  socket.on('connect', () => {
    if (!active) return;
    setRealtimeStatus('connected');
    // reconexão: eventos perdidos durante a queda são recuperados pela API
    if (wasConnected) reconcile(qc, userId);
    wasConnected = true;
  });
  const down = () => { if (active) setRealtimeStatus('disconnected'); };
  socket.on('disconnect', down);
  socket.on('connect_error', down);

  const handle = (raw: unknown) => {
    if (!active) return;
    const parsed = realtimeEventSchema.safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    // isolamento: evento de outro usuário nunca é aplicado, mesmo que o servidor o entregue
    if (event.userId !== null && event.userId !== userId) return;
    if (!ledger.accept(event)) return;
    applyEvent(qc, event, userId);
  };
  socket.on('nft.updated', handle);
  socket.on('order.updated', handle);

  return () => {
    if (!active) return;
    active = false;
    socket.removeAllListeners();
    socket.disconnect();
  };
}
