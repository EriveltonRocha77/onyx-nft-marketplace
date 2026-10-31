import { z } from 'zod';
import { ethString, networkSchema, nonNegativeInt, positiveInt, summarySchema } from './common';

export const cartItemSchema = z.object({
  id: z.string(), nftId: z.string(), editionId: z.string(), quantity: positiveInt, name: z.string(), image: z.string(),
  editionLabel: z.string(), unitPriceEth: ethString, lineTotalEth: ethString, available: nonNegativeInt, nftVersion: positiveInt,
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: z.string(), items: z.array(cartItemSchema), coupon: z.object({ code: z.string() }).nullable(),
  network: networkSchema, summary: summarySchema, version: positiveInt,
});
export type Cart = z.infer<typeof cartSchema>;
