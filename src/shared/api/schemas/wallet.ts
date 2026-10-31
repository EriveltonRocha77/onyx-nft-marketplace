import { z } from 'zod';
import { networkSchema } from './common';

export const walletSchema = z.object({
  id: z.string(), label: z.string(), address: z.string(), role: z.enum(['primary', 'secondary']),
  network: networkSchema, connected: z.boolean(),
});
export type Wallet = z.infer<typeof walletSchema>;
export const walletListSchema = z.object({ items: z.array(walletSchema) });
export type WalletList = z.infer<typeof walletListSchema>;
