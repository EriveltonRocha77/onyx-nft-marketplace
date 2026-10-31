import { z } from 'zod';
import { isoDate, positiveInt } from './common';
import { nftSchema } from './nft';
import { orderStatusSchema } from './order';

const base = { id: z.string(), version: positiveInt, occurredAt: isoDate, userId: z.string().nullable() };

export const nftUpdatedEventSchema = z.object({
  ...base, type: z.literal('nft.updated'),
  resource: z.object({ kind: z.literal('nft'), id: z.string() }),
  payload: z.object({ nft: nftSchema }),
});
export const orderUpdatedEventSchema = z.object({
  ...base, type: z.literal('order.updated'),
  resource: z.object({ kind: z.literal('order'), id: z.string() }),
  payload: z.object({ status: orderStatusSchema, declineReason: z.string().nullable() }),
});
export const realtimeEventSchema = z.discriminatedUnion('type', [nftUpdatedEventSchema, orderUpdatedEventSchema]);
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>;
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>;
