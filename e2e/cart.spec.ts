import { expect, test } from '@playwright/test';
import { addToCart, login, mock, open, ANA } from './helpers/app';

test.describe('carrinho', () => {
  test('visitante adiciona, vê contador e mantém após refresh', async ({ page }) => {
    await open(page, '/');
    await addToCart(page, 'nft-001', 1);
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await page.reload();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
  });

  test('altera quantidade, respeita o limite e remove', async ({ page }) => {
    await open(page, '/');
    await addToCart(page);
    await page.goto('/cart');
    const qty = page.getByTestId('line-qty');
    await expect(qty).toHaveText('1');
    const total1 = await page.getByTestId('summary-total').textContent();
    await page.getByRole('button', { name: /Aumentar quantidade/ }).click();
    await expect(qty).toHaveText('2');
    await expect(page.getByTestId('summary-total')).not.toHaveText(total1!);
    await page.getByRole('button', { name: /Diminuir quantidade/ }).click();
    await expect(qty).toHaveText('1');
    await page.getByRole('button', { name: /Remover .* do carrinho/ }).click();
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
  });

  test('não passa do estoque ao aumentar', async ({ page }) => {
    await open(page, '/');
    await addToCart(page);
    await page.goto('/cart');
    const plus = page.getByRole('button', { name: /Aumentar quantidade/ });
    // nft-001 tem 7 unidades na edição padrão (fixture determinística)
    for (let q = 2; q <= 7; q++) {
      await plus.click();
      await expect(page.getByTestId('line-qty')).toHaveText(String(q));
    }
    await expect(plus).toBeDisabled();
  });

  test('cupom: aplica, mostra desconto, remove e trata inválido/expirado', async ({ page }) => {
    await open(page, '/');
    await addToCart(page);
    await page.goto('/cart');
    await expect(page.getByTestId('summary-discount')).toHaveCount(0);
    const input = page.getByLabel('Cupom de desconto');
    await input.fill('NADA');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('Cupom inválido.')).toBeVisible();
    await input.fill('EXPIRED20');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('Este cupom expirou.')).toBeVisible();
    await input.fill('ONYX10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByTestId('coupon-applied')).toContainText('ONYX10');
    await expect(page.getByTestId('summary-discount')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('coupon-applied')).toBeVisible();
    await page.getByRole('button', { name: /Remover cupom/ }).click();
    await expect(page.getByTestId('summary-discount')).toHaveCount(0);
  });

  test('itens do visitante são preservados ao entrar', async ({ page }) => {
    await open(page, '/');
    await addToCart(page, 'nft-001', 2);
    await login(page, ANA);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    await expect(page.getByTestId('line-qty')).toHaveText('2');
    await page.reload();
    await expect(page.getByTestId('line-qty')).toHaveText('2');
  });

  test('usuários diferentes não compartilham carrinho', async ({ page }) => {
    await open(page, '/');
    await login(page, ANA);
    await addToCart(page);
    await page.getByRole('button', { name: 'Sair' }).click();
    await login(page, 'bruno@onyx.test');
    await page.goto('/cart');
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
  });

  test('mostra skeleton do resumo durante carregamento lento', async ({ page }) => {
    await open(page, '/');
    await addToCart(page);
    await page.goto('/cart?scenario=slow');
    await expect(page.getByTestId('summary-skeleton')).toBeVisible();
    await expect(page.getByTestId('cart-item')).toBeVisible({ timeout: 20_000 });
  });

  test('falha ao carregar permite tentar de novo', async ({ page }) => {
    await open(page, '/');
    await addToCart(page);
    await page.goto('/cart?scenario=server-error');
    await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 20_000 });
    await mock(page, 'setScenario', 'default');
    await page.getByRole('button', { name: /Tentar novamente/i }).click();
    await expect(page.getByTestId('cart-item')).toBeVisible();
  });

  test('aviso quando preço muda enquanto o carrinho está aberto', async ({ page }) => {
    await open(page, '/');
    await addToCart(page);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { __mock: { getState(): { nfts: { id: string; editions: { priceEth: string }[] }[] } } };
      const nft = w.__mock.getState().nfts.find((n) => n.id === 'nft-001')!;
      nft.editions[0]!.priceEth = '9.000000000000000000';
    });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button', { name: /Aumentar quantidade/ }).click();
    await expect(page.getByTestId('cart-changes')).toContainText(/preço/i);
  });
});
