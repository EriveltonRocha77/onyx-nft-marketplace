import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, parse } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { featuredResponseSchema, nftListResponseSchema, type NftListResponse } from '../../shared/api/schemas';
import { toApiParams, type CatalogSearch } from './search';

export async function fetchNfts(params: Record<string, string>, signal?: AbortSignal): Promise<NftListResponse> {
  const res = await api.get('/nfts', { params, signal });
  return parse(nftListResponseSchema, res.data);
}

export function useNftList(search: CatalogSearch, enabled = true) {
  const params = toApiParams(search);
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useFeatured() {
  return useQuery({
    queryKey: queryKeys.nfts.featured(),
    queryFn: async ({ signal }) => parse(featuredResponseSchema, (await api.get('/nfts/featured', { signal })).data).items,
  });
}
