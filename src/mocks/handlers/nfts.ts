import { http, HttpResponse } from 'msw';
import { MoneyError, parseEth, toDecimalString } from '../../shared/money/decimal';
import type { Nft, NftListResponse } from '../../shared/api/schemas';
import { applyScenario, getConfig } from '../scenarios/engine';
import { getDb } from '../store';
import { apiError, authenticate } from './util';

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const wei = (decimal: string): bigint => parseEth(decimal);

export function filterAndSort(nfts: Nft[], params: URLSearchParams, favoriteIds: string[] | null): { filtered: Nft[]; base: Nft[] } | { error: Response } {
  const q = norm(params.get('q')?.trim() ?? '');
  const collection = params.get('collection');
  const category = params.get('category');
  const availability = params.get('availability');
  let min: bigint | null = null;
  let max: bigint | null = null;
  try {
    if (params.get('minPrice')) min = wei(params.get('minPrice')!);
    if (params.get('maxPrice')) max = wei(params.get('maxPrice')!);
  } catch (e) {
    if (e instanceof MoneyError) return { error: apiError(422, 'VALIDATION_ERROR', 'Faixa de preço inválida.', { fields: { price: 'Informe valores em ETH válidos.' } }) };
    throw e;
  }
  const base = nfts.filter((n) => {
    if (q && !norm(`${n.name} ${n.description} ${n.creator} ${n.collection.name}`).includes(q)) return false;
    const p = wei(n.priceFromEth);
    if (min !== null && p < min) return false;
    if (max !== null && p > max) return false;
    if (availability === 'available' && n.availableTotal === 0) return false;
    if (favoriteIds && !favoriteIds.includes(n.id)) return false;
    return true;
  });
  const filtered = base.filter((n) => (!collection || n.collection.id === collection) && (!category || n.category.id === category));
  const sort = params.get('sort') ?? 'newest';
  const cmpPrice = (a: Nft, b: Nft) => { const d = wei(a.priceFromEth) - wei(b.priceFromEth); return d < 0n ? -1 : d > 0n ? 1 : 0; };
  filtered.sort((a, b) => {
    if (sort === 'price_asc') return cmpPrice(a, b) || a.id.localeCompare(b.id);
    if (sort === 'price_desc') return cmpPrice(b, a) || a.id.localeCompare(b.id);
    if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id);
    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
  });
  return { filtered, base };
}

function facets(base: Nft[], all: Nft[]): NftListResponse['facets'] {
  const count = (key: 'collection' | 'category') => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const n of base) {
      const e = map.get(n[key].id) ?? { id: n[key].id, name: n[key].name, count: 0 };
      e.count += 1;
      map.set(n[key].id, e);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  };
  const prices = all.map((n) => wei(n.priceFromEth));
  const lo = prices.length ? prices.reduce((a, b) => (a < b ? a : b)) : 0n;
  const hi = prices.length ? prices.reduce((a, b) => (a > b ? a : b)) : 0n;
  return { collections: count('collection'), categories: count('category'), priceRange: { minEth: toDecimalString(lo), maxEth: toDecimalString(hi) } };
}

export const nftHandlers = [
  http.get('*/api/nfts/featured', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    if (getConfig().emptyCatalog) return HttpResponse.json({ items: [] });
    return HttpResponse.json({ items: getDb().nfts.filter((n) => n.featured).slice(0, 8) });
  }),

  http.get('*/api/nfts/:id', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const nft = getConfig().emptyCatalog ? undefined : getDb().nfts.find((n) => n.id === params['id']);
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.');
    return HttpResponse.json(nft);
  }),

  http.get('*/api/nfts', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const url = new URL(request.url);
    const wantsFavorites = url.searchParams.get('favorites') === 'true';
    let favoriteIds: string[] | null = null;
    if (wantsFavorites) {
      const auth = authenticate(request);
      if ('response' in auth) return auth.response;
      favoriteIds = getDb().favorites[auth.user.id] ?? [];
    }
    const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get('pageSize')) || 12));
    const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
    const all = getConfig().emptyCatalog ? [] : getDb().nfts;
    const result = filterAndSort(all, url.searchParams, favoriteIds);
    if ('error' in result) return result.error;
    const total = result.filtered.length;
    const body: NftListResponse = {
      items: result.filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      facets: facets(result.base, all),
    };
    return HttpResponse.json(body);
  }),
];
