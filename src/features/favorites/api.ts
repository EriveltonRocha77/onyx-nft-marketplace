import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { api, parse } from '../../shared/api/client';
import { toApiError } from '../../shared/api/errors';
import { queryKeys } from '../../shared/api/queryKeys';
import { useAnnounce } from '../../shared/ui/live-announcer';

const favoritesSchema = z.object({ nftIds: z.array(z.string()) });
export type FavoritesData = z.infer<typeof favoritesSchema>;

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.user(userId ?? 'anon').favorites(),
    queryFn: async ({ signal }) => parse(favoritesSchema, (await api.get('/favorites', { signal })).data),
    enabled: Boolean(userId),
  });
}

interface ToggleVars { nftId: string; next: boolean; name?: string }

/** Atualização otimista: o coração muda na hora; em falha volta ao estado anterior e avisa. */
export function useToggleFavorite(userId: string) {
  const qc = useQueryClient();
  const announce = useAnnounce();
  const key = queryKeys.user(userId).favorites();
  const mutationKey = ['favorites', 'toggle', userId];

  return useMutation({
    mutationKey,
    mutationFn: async ({ nftId, next }: ToggleVars) => {
      try {
        if (next) await api.put(`/favorites/${encodeURIComponent(nftId)}`);
        else await api.delete(`/favorites/${encodeURIComponent(nftId)}`);
      } catch (e) { throw toApiError(e); }
    },
    onMutate: async ({ nftId, next }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FavoritesData>(key);
      qc.setQueryData<FavoritesData>(key, (old) => {
        const ids = old?.nftIds ?? [];
        return { nftIds: next ? [...new Set([...ids, nftId])] : ids.filter((i) => i !== nftId) };
      });
      return { previous };
    },
    onError: (_err, { name }, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      const msg = `Não foi possível atualizar os favoritos${name ? ` de ${name}` : ''}. Tente novamente.`;
      toast.error(msg);
      announce(msg, 'assertive');
    },
    onSuccess: (_d, { next, name }) => {
      announce(next ? `${name ?? 'NFT'} adicionado aos favoritos.` : `${name ?? 'NFT'} removido dos favoritos.`);
    },
    onSettled: () => {
      // só revalida quando a última alternância terminou, evitando sobrescrever cliques rápidos
      if (qc.isMutating({ mutationKey }) <= 1) {
        void qc.invalidateQueries({ queryKey: key });
        void qc.invalidateQueries({ queryKey: queryKeys.nfts.all(), predicate: (q) => JSON.stringify(q.queryKey).includes('"favorites":"true"') });
      }
    },
  });
}
