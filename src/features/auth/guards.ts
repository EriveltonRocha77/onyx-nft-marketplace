import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { sessionQuery } from './api';
import { getToken } from './session';

interface GuardContext {
  context: { queryClient: QueryClient };
  location: { href: string };
}

/** Protege rotas privadas: sem sessão válida, vai ao login e volta depois. */
export async function requireAuth({ context, location }: GuardContext): Promise<void> {
  const toLogin = () => redirect({ to: '/login', search: { redirect: location.href } });
  if (!getToken()) throw toLogin();
  try {
    await context.queryClient.ensureQueryData(sessionQuery);
  } catch {
    throw toLogin();
  }
}

/** Telas de login e cadastro redirecionam quem já está autenticado. */
export async function redirectIfAuthenticated({ context }: Pick<GuardContext, 'context'>, to = '/'): Promise<void> {
  if (!getToken()) return;
  try {
    await context.queryClient.ensureQueryData(sessionQuery);
    throw redirect({ to });
  } catch (e) {
    if (e && typeof e === 'object' && 'isRedirect' in e) throw e;
  }
}
