import { defineConfig, devices } from '@playwright/test';

/**
 * Por padrão usa o Chromium do próprio Playwright (`pnpm exec playwright install chromium`).
 * Em redes sem acesso ao download oficial, PW_USE_PACKAGED_CHROMIUM=1 usa o binário de
 * `@sparticuz/chromium`, ou PW_CHROMIUM_PATH aponta para um Chromium existente.
 */
async function resolveLaunch(): Promise<{ executablePath?: string; args: string[] }> {
  if (process.env.PW_CHROMIUM_PATH) {
    return { executablePath: process.env.PW_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] };
  }
  if (process.env.PW_USE_PACKAGED_CHROMIUM === '1') {
    const { default: chromium } = await import('@sparticuz/chromium');
    return { executablePath: await chromium.executablePath(), args: [...chromium.args] };
  }
  return { args: [] };
}

const launch = await resolveLaunch();
const port = Number(process.env.E2E_PORT ?? 4173);
const useBuild = process.env.E2E_DEV !== '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    // Baselines versionadas, independentes de SO: as fontes vêm empacotadas (fontsource), então a renderização é estável.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: launch.executablePath, args: launch.args },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } }, grep: /@layout/ },
  ],
  webServer: {
    command: useBuild
      ? `VITE_MOCKS=on VITE_API_TIMEOUT_MS=5000 pnpm exec vite build && pnpm exec vite preview --port ${port} --strictPort`
      : `VITE_MOCKS=on VITE_API_TIMEOUT_MS=5000 pnpm exec vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
