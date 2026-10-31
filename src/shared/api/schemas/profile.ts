import { z } from 'zod';

export const profileSchema = z.object({
  id: z.string(), name: z.string(), displayName: z.string(), email: z.string(), bio: z.string(), avatarUrl: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
