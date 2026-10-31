import { useMutation, useQuery } from '@tanstack/react-query';
import { api, parse } from '../../shared/api/client';
import { ApiError, toApiError } from '../../shared/api/errors';
import { queryKeys } from '../../shared/api/queryKeys';
import { orderSchema, quoteSchema, type Network, type Order, type Quote } from '../../shared/api/schemas';
import { useSession } from '../auth/api';

export interface CollectorInput { name: string; email: string; document: string }
export interface OrderBody { quoteId: string; walletId: string; network: Network; collector: CollectorInput }

export function useCreateQuote() {
  return useMutation<Quote, ApiError, { network: Network; walletId: string }>({
    mutationFn: async (v) => {
      try { return parse(quoteSchema, (await api.post('/quotes', v)).data); } catch (e) { throw toApiError(e); }
    },
  });
}

export const isTransient = (e: unknown): boolean => e instanceof ApiError && (e.code === 'NETWORK' || e.code === 'TIMEOUT');

/**
 * Cria o pedido com chave de idempotência. Falhas de rede/timeout são repetidas com a MESMA chave,
 * então o servidor devolve o pedido já criado em vez de duplicá-lo.
 */
export function useCreateOrder() {
  return useMutation<Order, ApiError, { key: string; body: OrderBody }>({
    mutationFn: async ({ key, body }) => {
      try {
        return parse(orderSchema, (await api.post('/orders', body, { headers: { 'Idempotency-Key': key } })).data);
      } catch (e) { throw toApiError(e); }
    },
    retry: (count, error) => count < 2 && isTransient(error),
    retryDelay: 800,
  });
}

export const isTerminal = (o: Pick<Order, 'status'> | undefined): boolean => o?.status === 'confirmed' || o?.status === 'declined';

export function useOrder(orderId: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.user(user?.id ?? 'anon').order(orderId),
    queryFn: async ({ signal }) => parse(orderSchema, (await api.get(`/orders/${encodeURIComponent(orderId)}`, { signal })).data),
    enabled: Boolean(user),
    // enquanto pendente, confirma periodicamente pela API; estados terminais não são mais consultados
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 1500 : false),
  });
}
