import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import type { Cart, Nft, NftListResponse, Order, RealtimeEvent } from '../api/schemas';

const isCartKey = (key: QueryKey): boolean => (key[0] === 'user' && key[2] === 'cart') || (key[0] === 'guest' && key[1] === 'cart');
const newer = (cached: { version: number } | undefined, incoming: { version: number }): boolean => !cached || incoming.version > cached.version;

/** Só recarrega carrinhos que contêm o NFT: o resumo continua vindo da API, nunca recalculado aqui. */
function refreshCartsWith(qc: QueryClient, nftId: string): void {
  void qc.invalidateQueries({
    predicate: (q) => isCartKey(q.queryKey) && (q.state.data as Cart | undefined)?.items.some((i) => i.nftId === nftId) === true,
  });
}

/** Aplica um evento já validado, deduplicado e pertencente à sessão atual ao cache do Query. */
export function applyEvent(qc: QueryClient, event: RealtimeEvent, userId: string | null): void {
  if (event.type === 'nft.updated') {
    const nft = event.payload.nft;
    qc.setQueryData<Nft>(queryKeys.nfts.detail(nft.id), (old) => (old && newer(old, nft) ? nft : old));
    qc.setQueriesData<NftListResponse>({ queryKey: ['nfts', 'list'] }, (old) =>
      old && { ...old, items: old.items.map((i) => (i.id === nft.id && newer(i, nft) ? nft : i)) },
    );
    qc.setQueryData<Nft[]>(queryKeys.nfts.featured(), (old) => old?.map((i) => (i.id === nft.id && newer(i, nft) ? nft : i)));
    refreshCartsWith(qc, nft.id);
    return;
  }

  // order.updated: o evento traz só o estado; o recibo completo vem da API.
  if (!userId) return;
  const key = queryKeys.user(userId).order(event.resource.id);
  const cached = qc.getQueryData<Order>(key);
  if (cached && (cached.status !== 'pending' || cached.version >= event.version)) return; // terminal não regride
  void qc.invalidateQueries({ queryKey: key });
  if (event.payload.status !== 'pending') void qc.invalidateQueries({ queryKey: queryKeys.user(userId).cart() });
}

/** Após reconexão: o que pode ter mudado durante a queda é rebuscado na API REST (apenas consultas ativas). */
export function reconcile(qc: QueryClient, userId: string | null): void {
  void qc.invalidateQueries({ queryKey: queryKeys.nfts.all() });
  void qc.invalidateQueries({ predicate: (q) => isCartKey(q.queryKey) });
  if (userId) void qc.invalidateQueries({ queryKey: [...queryKeys.user(userId).all(), 'order'] });
}
