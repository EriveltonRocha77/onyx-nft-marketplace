import { z } from 'zod';
import { isoDate, networkSchema, positiveInt, summarySchema } from './common';
import { quoteLineSchema } from './quote';

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const receiptSchema = z.object({
  lines: z.array(quoteLineSchema), summary: summarySchema, network: networkSchema, couponCode: z.string().nullable(),
  walletAddress: z.string(), snapshotAt: isoDate, txHash: z.string().nullable(), confirmedAt: isoDate.nullable(),
});
export type Receipt = z.infer<typeof receiptSchema>;

export const collectorSchema = z.object({ name: z.string(), email: z.string(), document: z.string() });
export type Collector = z.infer<typeof collectorSchema>;

export const orderSchema = z.object({
  id: z.string(), status: orderStatusSchema, version: positiveInt, createdAt: isoDate, updatedAt: isoDate,
  quoteId: z.string(), network: networkSchema, walletId: z.string(), collector: collectorSchema,
  declineReason: z.string().nullable(), receipt: receiptSchema,
});
export type Order = z.infer<typeof orderSchema>;
