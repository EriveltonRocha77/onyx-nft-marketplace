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

export const CPF = '529.982.247-25';

/** Estado dos mocks (somente leitura) para verificar o resultado das operações. */
export async function mockState<T>(page: Page, pick: string): Promise<T> {
  return page.evaluate((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (window as any).__mock.getState() as Record<string, unknown>;
    return JSON.parse(JSON.stringify(db[p]));
  }, pick) as Promise<T>;
}

/** Login como Ana, um item no carrinho e abre o pagamento com dados válidos preenchidos. */
export async function toCheckout(page: Page, opts: { connect?: boolean; nft?: string; qty?: number } = {}) {
  await open(page, '/');
  await login(page, ANA);
  await addToCart(page, opts.nft ?? 'nft-001', opts.qty ?? 1);
  await page.goto('/checkout');
  await expect(page.getByLabel('CPF')).toBeVisible();
  await page.getByLabel('CPF').fill(CPF);
  if (opts.connect !== false) {
    await page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Desconectar' })).toBeVisible();
  }
}

export async function review(page: Page) {
  await page.getByRole('button', { name: 'Revisar pedido' }).click();
  await expect(page.getByTestId('review')).toBeVisible();
}
