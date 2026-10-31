import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, parse } from '../../shared/api/client';
import { toApiError, type ApiError } from '../../shared/api/errors';
import { queryKeys } from '../../shared/api/queryKeys';
import { walletListSchema, walletSchema, type Network, type Wallet } from '../../shared/api/schemas';
import { useSession } from '../auth/api';

export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const networkLabels: Record<Network, string> = { ethereum: 'Ethereum', polygon: 'Polygon', base: 'Base' };
export const shortAddress = (a: string): string => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function useWallets() {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.user(user?.id ?? 'anon').wallets(),
    queryFn: async ({ signal }) => parse(walletListSchema, (await api.get('/wallets', { signal })).data).items,
    enabled: Boolean(user),
  });
}

function useWalletMutation<V>(call: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation<Wallet, ApiError, V>({
    mutationFn: async (v) => {
      try { return parse(walletSchema, await call(v)); } catch (e) { throw toApiError(e); }
    },
    onSuccess: () => { if (user) void qc.invalidateQueries({ queryKey: queryKeys.user(user.id).wallets() }); },
  });
}

export interface WalletInput { label: string; address: string; network: Network }
export const useCreateWallet = () => useWalletMutation<WalletInput & { role: 'primary' | 'secondary' }>(async (v) => (await api.post('/wallets', v)).data);
export const useUpdateWallet = () => useWalletMutation<WalletInput & { id: string }>(async ({ id, ...body }) => (await api.patch(`/wallets/${encodeURIComponent(id)}`, body)).data);
export const useConnectWallet = () => useWalletMutation<string>(async (id) => (await api.post(`/wallets/${encodeURIComponent(id)}/connect`)).data);
export const useDisconnectWallet = () => useWalletMutation<string>(async (id) => (await api.post(`/wallets/${encodeURIComponent(id)}/disconnect`)).data);
