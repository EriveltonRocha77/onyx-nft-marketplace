import { z } from 'zod';
import { ethString, isoDate, networkSchema, positiveInt, summarySchema } from './common';

export const quoteLineSchema = z.object({
  nftId: z.string(), editionId: z.string(), name: z.string(), editionLabel: z.string(),
  quantity: positiveInt, unitPriceEth: ethString, lineTotalEth: ethString,
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const quoteSchema = z.object({
  quoteId: z.string(), version: positiveInt, network: networkSchema, walletId: z.string().nullable(),
  couponCode: z.string().nullable(), lines: z.array(quoteLineSchema), summary: summarySchema, expiresAt: isoDate,
});
export type Quote = z.infer<typeof quoteSchema>;
