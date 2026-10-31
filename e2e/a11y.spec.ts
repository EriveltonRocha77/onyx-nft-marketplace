import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addToCart, ANA, CPF, login, open, review, toCheckout } from './helpers/app';

async function scan(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(summary, summary.join('\n')).toEqual([]);
}

test.describe('acessibilidade (axe)', () => {
  test('início', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
    await scan(page);
  });
  test('início com filtros e estado vazio', async ({ page }) => {
    await open(page, '/?q=zzzz');
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await scan(page);
  });
  test('detalhe do NFT', async ({ page }) => {
    await open(page, '/nft/nft-005');
    await expect(page.getByTestId('gallery')).toBeVisible();
    await scan(page);
  });
  test('login e cadastro', async ({ page }) => {
    await open(page, '/login');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await scan(page);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await scan(page);
    await page.goto('/register');
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await scan(page);
  });
  test('carrinho vazio e com itens', async ({ page }) => {
    await open(page, '/cart');
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
    await scan(page);
    await addToCart(page);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await scan(page);
  });
  test('perfil e carteiras', async ({ page }) => {
    await open(page, '/');
    await login(page, ANA);
    await page.goto('/profile');
    await expect(page.getByLabel('Nome completo')).toBeVisible();
    await scan(page);
    await page.goto('/wallets');
    await expect(page.getByTestId('wallet-card').first()).toBeVisible();
    await scan(page);
  });
  test('pagamento, revisão e recibo', async ({ page }) => {
    await toCheckout(page);
    await scan(page);
    await review(page);
    await scan(page);
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 });
    await scan(page);
  });
  test('rota inexistente', async ({ page }) => {
    await open(page, '/nao-existe');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await scan(page);
  });
});

void CPF;
