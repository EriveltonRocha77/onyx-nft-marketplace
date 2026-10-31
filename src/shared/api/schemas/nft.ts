import { z } from 'zod';
import { ethString, isoDate, nonNegativeInt, positiveInt } from './common';

export const editionSchema = z.object({ id: z.string(), label: z.string(), priceEth: ethString, available: nonNegativeInt, total: positiveInt });
export type Edition = z.infer<typeof editionSchema>;

export const nftSchema = z.object({
  id: z.string(), name: z.string(), description: z.string(),
  collection: z.object({ id: z.string(), name: z.string() }),
  category: z.object({ id: z.string(), name: z.string() }),
  creator: z.string(), images: z.array(z.string()).min(1), editions: z.array(editionSchema).min(1),
  priceFromEth: ethString, availableTotal: nonNegativeInt, featured: z.boolean(), version: positiveInt, createdAt: isoDate,
});
export type Nft = z.infer<typeof nftSchema>;

const facetSchema = z.object({ id: z.string(), name: z.string(), count: nonNegativeInt });

export const nftListResponseSchema = z.object({
  items: z.array(nftSchema), page: positiveInt, pageSize: positiveInt, total: nonNegativeInt, totalPages: nonNegativeInt,
  facets: z.object({ collections: z.array(facetSchema), categories: z.array(facetSchema), priceRange: z.object({ minEth: ethString, maxEth: ethString }) }),
});
export type NftListResponse = z.infer<typeof nftListResponseSchema>;

export const featuredResponseSchema = z.object({ items: z.array(nftSchema) });
export type FeaturedResponse = z.infer<typeof featuredResponseSchema>;
