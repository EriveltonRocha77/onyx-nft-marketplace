import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RegisterPage } from '../../features/auth/RegisterPage';
import { redirectIfAuthenticated } from '../../features/auth/guards';

const searchSchema = z.object({ redirect: z.string().optional().catch(undefined) });

export const Route = createFileRoute('/register')({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async ({ context, search }) => redirectIfAuthenticated({ context }, search.redirect ?? '/'),
  component: function RegisterRoute() {
    const { redirect } = Route.useSearch();
    return <RegisterPage redirectTo={redirect} />;
  },
});
