import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

/**
 * Os mocks (MSW) precisam estar ativos ANTES de qualquer módulo que capture
 * `globalThis.WebSocket` (o engine.io-client faz isso ao ser importado). Por isso
 * a aplicação é importada dinamicamente só depois de `startMocks()`.
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env.VITE_MOCKS === 'on') {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }
  const { App } = await import('./app/App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
