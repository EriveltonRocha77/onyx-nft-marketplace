import { z } from 'zod';
import { isoDate } from './common';

export const sessionUserSchema = z.object({ id: z.string(), name: z.string(), displayName: z.string(), email: z.string(), avatarUrl: z.string().nullable() });
export const sessionSchema = z.object({ user: sessionUserSchema, expiresAt: isoDate });
export type Session = z.infer<typeof sessionSchema>;
export const authResponseSchema = z.object({ token: z.string(), session: sessionSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;
