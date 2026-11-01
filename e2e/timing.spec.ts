import { expect, test } from '@playwright/test';
import { mock, open, review, toCheckout } from './helpers/app';

test.describe('tempo e ordem de respostas', () => {
  test('resposta antiga e lenta não sobrescreve a busca mais recente', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();

    // a próxima consulta à lista demora 3 s; a seguinte responde na hora
    await mock(page, 'delayNext', 'GET /api/nfts', 3000);
    await page.getByLabel('Ordenar por').selectOption('price_asc');
    await page.getByLabel('Ordenar por').selectOption('price_desc');
    await expect(page).toHaveURL(/sort=price_desc/);

    const expectedFirst = await page.evaluate(async () => {
      const r = await fetch('/api/nfts?sort=price_desc&page=1&pageSize=12');
      return ((await r.json()) as { items: { id: string }[] }).items[0]!.id;
    });
    await expect(page.getByTestId('nft-card').first()).toHaveAttribute('data-nft-id', expectedFirst);

    // espera a resposta lenta (price_asc) chegar e confirma que a tela não mudou
    await page.waitForTimeout(3500);
    await expect(page.getByLabel('Ordenar por')).toHaveValue('price_desc');
    await expect(page.getByTestId('nft-card').first()).toHaveAttribute('data-nft-id', expectedFirst);
  });

  test('relógio controlado: pagamento lento fica pendente e confirma ao avançar o tempo', async ({ page }) => {
    await page.clock.install();
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', { paymentDelayMs: 600_000 });
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/orders\/ord_/);
    await expect(page.getByTestId('order-pending')).toBeVisible();

    await page.clock.fastForward('10:30');
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 });
  });
});
