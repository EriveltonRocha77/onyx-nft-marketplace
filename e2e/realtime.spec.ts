import { expect, test, type Page } from '@playwright/test';
import { addToCart, ANA, login, mock, mockState, open, review, socketReady, toCheckout } from './helpers/app';

const priceText = (page: Page) => page.getByTestId('detail-price');
const nftState = (page: Page, id: string) => mockState<{ id: string; version: number; editions: { priceEth: string; available: number }[] }[]>(page, 'nfts').then((l) => l.find((n) => n.id === id)!);

test.describe('tempo real (Socket.IO)', () => {
  test('nft.updated atualiza o detalhe aberto e avisa a mudança', async ({ page }) => {
    await open(page, '/nft/nft-001');
    await expect(priceText(page)).toBeVisible();
    await socketReady(page);
    await mock(page, 'mutateNft', 'nft-001', { priceEth: '3.5' });
    await expect(priceText(page)).toContainText('3,50 ETH');
    await expect(page.getByTestId('nft-changes')).toContainText(/preço/i);
  });

  test('nft.updated atualiza o cartão no catálogo', async ({ page }) => {
    await open(page, '/');
    const card = page.getByTestId('nft-card').first();
    await expect(card).toBeVisible();
    const id = (await card.getAttribute('data-nft-id'))!;
    await socketReady(page);
    await mock(page, 'mutateNft', id, { priceEth: '0.123' });
    await expect(page.locator(`[data-testid="nft-card"][data-nft-id="${id}"]`)).toContainText('0,123 ETH');
  });

  test('carrinho aberto: preço muda → aviso e resumo atualizado pela API', async ({ page }) => {
    await open(page, '/');
    await addToCart(page, 'nft-001', 1);
    await page.goto('/cart');
    const total = await page.getByTestId('summary-total').textContent();
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await socketReady(page);
    await mock(page, 'mutateNft', 'nft-001', { priceEth: '5' });
    await expect(page.getByTestId('cart-changes')).toContainText(/preço/i);
    await expect(page.getByTestId('summary-total')).not.toHaveText(total!);
  });

  test('carrinho aberto: item esgotado bloqueia o avanço', async ({ page }) => {
    await open(page, '/');
    await addToCart(page, 'nft-001', 1);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await socketReady(page);
    await mock(page, 'mutateNft', 'nft-001', { available: 0 });
    await expect(page.getByTestId('line-issue')).toContainText(/Esgotado/);
    await expect(page.getByRole('button', { name: 'Resolva os itens indisponíveis' })).toBeDisabled();
  });

  test('checkout: mudança durante a revisão impede confirmar com cotação antiga', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await socketReady(page, 'user-ana');
    await mock(page, 'mutateNft', 'nft-001', { priceEth: '4' });
    await expect(page.getByTestId('quote-outdated')).toBeVisible();
    await expect(page.getByTestId('confirm-order')).toBeDisabled();
    await page.getByRole('button', { name: 'Atualizar cotação' }).click();
    await expect(page.getByTestId('quote-outdated')).toHaveCount(0);
    await expect(page.getByTestId('confirm-order')).toBeEnabled();
    await page.getByTestId('confirm-order').click();
    await expect(page).toHaveURL(/\/orders\/ord_/);
    const orders = Object.values(await mockState<Record<string, { receipt: { lines: { unitPriceEth: string }[] } }>>(page, 'orders'));
    expect(orders).toHaveLength(1);
    expect(Number(orders[0]!.receipt.lines[0]!.unitPriceEth)).toBe(4);
  });

  test('eventos duplicados não reaplicam efeitos', async ({ page }) => {
    await open(page, '/');
    await addToCart(page, 'nft-001', 1);
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await socketReady(page);
    let carts = 0;
    page.on('request', (r) => { if (r.method() === 'GET' && new URL(r.url()).pathname === '/api/cart') carts += 1; });
    await mock(page, 'mutateNft', 'nft-001', { priceEth: '2' });
    await expect.poll(() => carts).toBe(1);
    for (let i = 0; i < 3; i++) await mock(page, 'emitCurrent', 'nft', 'nft-001');
    await page.waitForTimeout(1200);
    expect(carts).toBe(1);
    await expect(page.getByTestId('cart-changes').locator('li')).toHaveCount(1);
  });

  test('evento antigo não regride um estado mais recente', async ({ page }) => {
    await open(page, '/nft/nft-001');
    await expect(priceText(page)).toBeVisible();
    await socketReady(page);
    await mock(page, 'mutateNft', 'nft-001', { priceEth: '3' });
    await expect(priceText(page)).toContainText('3,00 ETH');
    const current = await nftState(page, 'nft-001');
    const stale = { ...current, version: current.version - 1, editions: current.editions.map((e, i) => (i === 0 ? { ...e, priceEth: '0.001000000000000000' } : e)) };
    await page.evaluate(({ stale }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__mock.emitRaw({ id: 'evt_old', type: 'nft.updated', resource: { kind: 'nft', id: stale.id }, version: stale.version, occurredAt: new Date().toISOString(), userId: null, payload: { nft: { ...(window as any).__mock.getState().nfts.find((n: { id: string }) => n.id === stale.id), version: stale.version, editions: stale.editions } } });
    }, { stale });
    await page.waitForTimeout(800);
    await expect(priceText(page)).toContainText('3,00 ETH');
  });

  test('desconexão mostra aviso e a reconexão reconcilia com a API REST', async ({ page }) => {
    await open(page, '/nft/nft-001');
    await expect(priceText(page)).toBeVisible();
    await socketReady(page);
    await mock(page, 'disconnectSocket', { block: true });
    await expect(page.getByTestId('connection-banner')).toBeVisible();
    // mudança durante a queda: nenhum evento chega
    await mock(page, 'mutateNft', 'nft-001', { priceEth: '6' });
    await page.waitForTimeout(600);
    await expect(priceText(page)).not.toContainText('6,00 ETH');
    await mock(page, 'reconnectSocket');
    await expect(page.getByTestId('connection-banner')).toHaveCount(0, { timeout: 15_000 });
    await expect(priceText(page)).toContainText('6,00 ETH');
  });

  test('order.updated pelo socket confirma o pedido sem esperar o polling', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', { paymentDelayMs: 600_000 });
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-pending')).toBeVisible();
    await socketReady(page, 'user-ana');
    const id = new URL(page.url()).pathname.split('/').pop()!;
    await mock(page, 'resolveOrder', id, 'confirmed');
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 4000 });
    await expect(page.getByTestId('receipt-tx')).toBeVisible();
  });

  test('queda de conexão com pedido pendente: reconecta e recupera sem nova compra', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', { paymentDelayMs: 600_000 });
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-pending')).toBeVisible();
    await socketReady(page, 'user-ana');
    const id = new URL(page.url()).pathname.split('/').pop()!;
    await mock(page, 'disconnectSocket', { block: true });
    await expect(page.getByTestId('connection-banner')).toBeVisible();
    await mock(page, 'resolveOrder', id, 'declined');
    await mock(page, 'reconnectSocket');
    await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 15_000 });
    expect(Object.keys(await mockState<Record<string, unknown>>(page, 'orders'))).toHaveLength(1);
    await page.reload();
    await expect(page.getByTestId('order-declined')).toBeVisible();
  });

  test('evento de outro usuário é descartado pelo cliente', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await mock(page, 'setScenario', { paymentDelayMs: 600_000 });
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-pending')).toBeVisible();
    await socketReady(page, 'user-ana');
    const id = new URL(page.url()).pathname.split('/').pop()!;
    // o servidor é forçado a entregar; o cliente deve ignorar por pertencer a outro usuário
    await mock(page, 'emitRaw', { id: 'evt_foreign', type: 'order.updated', resource: { kind: 'order', id }, version: 99, occurredAt: new Date().toISOString(), userId: 'user-bruno', payload: { status: 'confirmed', declineReason: null } }, { force: true });
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('order-pending')).toBeVisible();
    await expect(page.getByTestId('order-confirmed')).toHaveCount(0);
  });

  test('pedido terminal não regride com evento pendente atrasado', async ({ page }) => {
    await toCheckout(page);
    await review(page);
    await page.getByTestId('confirm-order').click();
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 });
    const id = new URL(page.url()).pathname.split('/').pop()!;
    await mock(page, 'emitRaw', { id: 'evt_late', type: 'order.updated', resource: { kind: 'order', id }, version: 1, occurredAt: new Date().toISOString(), userId: 'user-ana', payload: { status: 'pending', declineReason: null } });
    await page.waitForTimeout(800);
    await expect(page.getByTestId('order-confirmed')).toBeVisible();
  });

  test('logout e troca de usuário encerram a conexão da sessão anterior', async ({ page }) => {
    await open(page, '/');
    await login(page, ANA);
    await socketReady(page, 'user-ana');
    await page.getByRole('button', { name: 'Sair' }).click();
    await socketReady(page, null);
    await expect.poll(async () => (await mock<{ userId: string | null }[]>(page, 'socketClients')).some((c) => c.userId === 'user-ana')).toBe(false);
    await login(page, 'bruno@onyx.test');
    await socketReady(page, 'user-bruno');
    await expect.poll(async () => (await mock<{ userId: string | null }[]>(page, 'socketClients')).map((c) => c.userId).sort()).toEqual(['user-bruno']);
  });
});
