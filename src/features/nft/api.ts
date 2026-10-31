import { useQuery } from '@tanstack/react-query';
import { api, parse } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { nftSchema } from '../../shared/api/schemas';

export function useNft(id: string) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: async ({ signal }) => parse(nftSchema, (await api.get(`/nfts/${encodeURIComponent(id)}`, { signal })).data),
  });
}
