import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginPage } from '../../features/auth/LoginPage';
import { redirectIfAuthenticated } from '../../features/auth/guards';

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
});

export const Route = createFileRoute('/login')({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async ({ context, search }) => redirectIfAuthenticated({ context }, search.redirect ?? '/'),
  component: function LoginRoute() {
    const { redirect, reason } = Route.useSearch();
    return <LoginPage redirectTo={redirect} reason={reason} />;
  },
});
