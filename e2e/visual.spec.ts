import { expect, test, type Page } from '@playwright/test';
import { addToCart, ANA, CPF, login, open } from './helpers/app';

/** Rola a página para disparar imagens preguiçosas, espera fontes/imagens e volta ao topo. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight / 2);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    // imagens fora da tela (ex.: carrossel de destaques) nunca disparam o carregamento preguiçoso
    const pending = Array.from(document.images).filter((i) => !i.complete);
    pending.forEach((i) => { i.loading = 'eager'; });
    await Promise.all(pending.map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); })));
  });
  await page.waitForTimeout(150);
}

const shot = async (page: Page, name: string) => {
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
};

test.describe('regressão visual', () => {
  test('início', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
    await expect(page.getByTestId('featured-card').first()).toBeVisible();
    await shot(page, 'inicio');
  });

  test('detalhe do NFT', async ({ page }) => {
    await open(page, '/nft/nft-005');
    await expect(page.getByTestId('gallery')).toBeVisible();
    await shot(page, 'detalhe');
  });

  test('carrinho', async ({ page }) => {
    await open(page, '/');
    await addToCart(page, 'nft-001', 2);
    await addToCart(page, 'nft-002', 1);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(2);
    await expect(page.getByTestId('summary-total')).toBeVisible();
    await shot(page, 'carrinho');
  });

  test('pagamento', async ({ page }) => {
    await open(page, '/');
    await login(page, ANA);
    await addToCart(page, 'nft-001', 1);
    await page.goto('/checkout');
    await expect(page.getByLabel('CPF')).toBeVisible();
    await page.getByLabel('CPF').fill(CPF);
    await expect(page.getByTestId('summary-total')).toBeVisible();
    await shot(page, 'pagamento');
  });
});
