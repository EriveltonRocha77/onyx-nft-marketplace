import { z } from 'zod';

export const ethString = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido');
export const networkSchema = z.enum(['ethereum', 'polygon', 'base']);
export type Network = z.infer<typeof networkSchema>;
export const isoDate = z.string();
export const positiveInt = z.number().int().positive();
export const nonNegativeInt = z.number().int().min(0);

export const summarySchema = z.object({ subtotalEth: ethString, discountEth: ethString, networkFeeEth: ethString, totalEth: ethString });
export type SummaryDto = z.infer<typeof summarySchema>;

export const apiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), fields: z.record(z.string(), z.string()).optional(), details: z.unknown().optional() }),
  requestId: z.string().optional(),
});
