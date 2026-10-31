import { z } from 'zod';
import { parseEth } from '../../shared/money/decimal';

export type Sort = 'newest' | 'price_asc' | 'price_desc' | 'name';
export const PAGE_SIZE = 12;

/** O router interpreta a query como JSON: números chegam como `number`. */
const looseString = z.union([z.string(), z.number()]).transform((v) => String(v));
const price = looseString.pipe(z.string().regex(/^\d+(\.\d{1,18})?$/)).optional().catch(undefined);

const rawSchema = z.object({
  q: looseString.transform((s) => s.trim()).optional().catch(undefined),
  collection: looseString.optional().catch(undefined),
  category: looseString.optional().catch(undefined),
  minPrice: price,
  maxPrice: price,
  availability: z.enum(['available', 'all']).optional().catch(undefined),
  favorites: z.boolean().optional().catch(undefined),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
});

/** Estado como vive na URL: só o que difere do padrão. */
export type RawSearch = z.output<typeof rawSchema>;

function fixPriceOrder(s: RawSearch): RawSearch {
  if (s.minPrice && s.maxPrice && parseEth(s.minPrice) > parseEth(s.maxPrice)) {
    return { ...s, minPrice: s.maxPrice, maxPrice: s.minPrice };
  }
  return s;
}

function strip(s: RawSearch): RawSearch {
  const out: RawSearch = {};
  if (s.q) out.q = s.q;
  if (s.collection) out.collection = s.collection;
  if (s.category) out.category = s.category;
  if (s.minPrice) out.minPrice = s.minPrice;
  if (s.maxPrice) out.maxPrice = s.maxPrice;
  if (s.availability && s.availability !== 'all') out.availability = s.availability;
  if (s.favorites) out.favorites = true;
  if (s.sort && s.sort !== 'newest') out.sort = s.sort;
  if (s.page && s.page > 1) out.page = s.page;
  return out;
}

/** Valida e limpa a query vinda da URL (usado em `validateSearch`). */
export const catalogSearchSchema = rawSchema.transform((s) => strip(fixPriceOrder(s)));

export interface CatalogSearch {
  q: string;
  collection?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  availability?: 'available' | 'all';
  favorites?: boolean;
  sort: Sort;
  page: number;
}

export function normalizeSearch(raw: RawSearch): CatalogSearch {
  return { ...raw, q: raw.q ?? '', sort: raw.sort ?? 'newest', page: raw.page ?? 1 };
}

/** Aplica uma mudança. Qualquer mudança além de `page` reinicia a paginação. */
export function withFilterChange(prev: CatalogSearch, patch: Partial<CatalogSearch>): RawSearch {
  const changedFilter = Object.keys(patch).some((k) => k !== 'page');
  const next: CatalogSearch = { ...prev, ...patch };
  if (changedFilter && !('page' in patch)) next.page = 1;
  return strip(fixPriceOrder(next));
}

export function hasActiveFilters(s: CatalogSearch): boolean {
  return Boolean(s.q || s.collection || s.category || s.minPrice || s.maxPrice || s.availability === 'available' || s.favorites);
}

export function toApiParams(s: CatalogSearch): Record<string, string> {
  const p: Record<string, string> = { sort: s.sort, page: String(s.page), pageSize: String(PAGE_SIZE) };
  if (s.q) p['q'] = s.q;
  if (s.collection) p['collection'] = s.collection;
  if (s.category) p['category'] = s.category;
  if (s.minPrice) p['minPrice'] = s.minPrice;
  if (s.maxPrice) p['maxPrice'] = s.maxPrice;
  if (s.availability) p['availability'] = s.availability;
  if (s.favorites) p['favorites'] = 'true';
  return p;
}
