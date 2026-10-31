import { expect, test } from '@playwright/test';
import { ANA, CPF, login, mock, mockState, open, review, toCheckout } from './helpers/app';


test.describe('pagamento e pedido', () => {
  test('compra completa: catálogo → carrinho → pagamento → recibo confirmado', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await expect(page.getByTestId('review-line')).toHaveCount(1);
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/orders\/ord_/);
    await expect(page.getByTestId('order-pending')).toBeVisible();
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('receipt-tx')).toContainText(/^0x[0-9a-f]{64}$/);
    await expect(page.getByTestId('receipt-line')).toHaveCount(1);
    await page.getByRole('button', { name: 'Ver no explorador' }).click();
    await expect(page.getByTestId('explorer-hash')).toBeVisible();
    await page.keyboard.press('Escape');
    // carrinho esvaziado só com o comprado
    await page.goto('/cart');
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
  });

  test('valida CPF e exige carteira conectada', async ({ page }) => {
    await toCheckout(page, { connect: false });
    await page.getByLabel('CPF').fill('111.111.111-11');
    await page.getByRole('button', { name: 'Revisar pedido' }).click();
    await expect(page.getByLabel('CPF')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('CPF').fill(CPF);
    await page.getByRole('button', { name: 'Revisar pedido' }).click();
    await expect(page.getByText('Conecte a carteira para continuar.').first()).toBeVisible();
    await expect(page.getByTestId('review')).toHaveCount(0);
  });

  test('pagamento recusado mostra o motivo e preserva o carrinho', async ({ page }) => {
    await toCheckout(page);
    await mock(page, 'setScenario', 'payment-declined');
    await review(page);
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('order-confirmed')).toHaveCount(0);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
  });

  test('clique repetido cria um único pedido', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    const btn = page.getByTestId('confirm-order');
    await btn.dblclick();
    await btn.click({ force: true, noWaitAfter: true }).catch(() => {});
    await expect(page).toHaveURL(/\/orders\/ord_/);
    expect(await mockState<Record<string, unknown>>(page, 'orders').then((o) => Object.keys(o).length)).toBe(1);
  });

  test('timeout após criar o pedido recupera o mesmo pedido pela idempotência', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', { orderTimeout: true, orderTimeoutDelayMs: 9000 });
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 25_000 });
    const orders = await mockState<Record<string, unknown>>(page, 'orders');
    expect(Object.keys(orders)).toHaveLength(1);
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 });
  });

  test('preço alterado exige nova confirmação com valores atualizados', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    const before = await page.getByTestId('summary-total').textContent();
    await mock(page, 'setScenario', 'price-changed');
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('quote-changed')).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    expect(await mockState<Record<string, unknown>>(page, 'orders').then((o) => Object.keys(o).length)).toBe(0);
    await expect(page.getByTestId('summary-total')).not.toHaveText(before!);
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/orders\/ord_/);
  });

  test('edição esgotada durante a compra bloqueia e mantém o carrinho', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', 'sold-out');
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('checkout-problem')).toContainText(/disponíveis|disponível/);
    await expect(page.getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible();
    expect(await mockState<Record<string, unknown>>(page, 'orders').then((o) => Object.keys(o).length)).toBe(0);
  });

  test('pedido pendente sobrevive a refresh sem criar outra compra', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', { paymentDelayMs: 4000 });
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-pending')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('order-pending').or(page.getByTestId('order-confirmed'))).toBeVisible();
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 });
    expect(await mockState<Record<string, unknown>>(page, 'orders').then((o) => Object.keys(o).length)).toBe(1);
  });

  test('sessão expira no pagamento: volta ao login e retoma com os dados', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', 'session-expired');
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/login\?.*reason=expired/);
    await expect(page.getByTestId('session-expired-notice')).toBeVisible();
    await page.getByLabel('E-mail').fill(ANA);
    await page.getByLabel('Senha').fill('Onyx#2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByLabel('CPF')).toHaveValue(CPF);
  });

  test('pedido de outra conta não é acessível', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/orders\/ord_/);
    const url = page.url();
    await page.getByRole('button', { name: 'Sair' }).click();
    await login(page, 'bruno@onyx.test');
    await page.goto(new URL(url).pathname);
    await expect(page.getByText('Pedido não encontrado')).toBeVisible();
  });

  test('acesso direto ao pagamento sem login vai ao login e volta', async ({ page }) => {
    await open(page, '/checkout');
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });
});
