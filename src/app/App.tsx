import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';
import { configureApi } from '../shared/api/client';
import { getToken, expireSession, safeRedirect } from '../features/auth/session';
import { queryClient } from './queryClient';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function getCartId(): string | null {
  try { return localStorage.getItem('onyx:cart-id'); } catch { return null; }
}

configureApi({
  getToken,
  getCartId,
  onSessionExpired: () => {
    // guarda onde o usuário estava e leva ao login; rascunhos permanecem para a retomada
    const here = safeRedirect(router.state.location.href);
    expireSession(queryClient);
    void router.navigate({ to: '/login', search: { redirect: here, reason: 'expired' } });
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
