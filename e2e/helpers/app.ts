import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Onyx#2026';
export const ANA = 'ana@onyx.test';
export const BRUNO = 'bruno@onyx.test';

/** Abre uma rota com cenário e armazenamento limpos (cada teste começa do zero). */
export async function open(page: Page, path = '/', scenario = 'default') {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__e2e_init')) {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__e2e_init', '1');
    }
  });
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}scenario=${scenario}`);
}

export async function login(page: Page, email = ANA, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
}

type MockCall = 'setScenario' | 'failNext' | 'delayNext' | 'expireSession' | 'reset' | 'setLatency';

/** Chama `window.__mock.<fn>(...args)` dentro da página (API de controle do mock). */
export async function mock(page: Page, fn: MockCall, ...args: unknown[]): Promise<void> {
  await page.evaluate(
    ([f, a]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const control = (window as any).__mock as Record<string, (...x: unknown[]) => unknown>;
      control[f as string]!(...(a as unknown[]));
    },
    [fn, args] as const,
  );
}

/** Adiciona o NFT ao carrinho pela tela de detalhe (edição padrão). */
export async function addToCart(page: Page, nftId = 'nft-001', times = 1) {
  await page.goto(`/nft/${nftId}`);
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho' });
  for (let i = 0; i < times; i++) {
    await add.click();
    await expect(page.getByRole('link', { name: 'Ver carrinho' })).toBeVisible();
  }
}
