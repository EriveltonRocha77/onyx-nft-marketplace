import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { NotFoundPage } from '../NotFoundPage';
import { t } from '../../shared/i18n';
import { ConnectionBanner } from '../../shared/layout/ConnectionBanner';
import { FocusManager } from '../../shared/layout/FocusManager';
import { Footer } from '../../shared/layout/Footer';
import { Header } from '../../shared/layout/Header';
import { ErrorState } from '../../shared/ui/states';
import { LiveAnnouncerProvider } from '../../shared/ui/live-announcer';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-24"><ErrorState error={error} onRetry={reset} title="Algo deu errado nesta página" /></div>
  ),
});

function RootLayout() {
  return (
    <LiveAnnouncerProvider>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground">
        {t('a11y.skipToContent')}
      </a>
      <div className="flex min-h-screen flex-col">
        <Header />
        <ConnectionBanner />
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 outline-none sm:px-6">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
      <FocusManager />
    </LiveAnnouncerProvider>
  );
}
