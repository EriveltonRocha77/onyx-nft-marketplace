import { expect, test, type Page } from '@playwright/test';
import { addToCart, ANA, login, open, toCheckout } from './helpers/app';

const WIDTHS = [320, 390, 768, 1024, 1440];

async function noOverflow(page: Page, label: string) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(o.sw, `${label}: scrollWidth ${o.sw} > clientWidth ${o.cw}`).toBeLessThanOrEqual(o.cw);
}

test.describe('layout responsivo', () => {
  test('sem overflow horizontal em 320, 390, 768, 1024 e 1440', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'varre todas as larguras uma vez');
    test.setTimeout(120_000);
    await open(page, '/');
    await login(page, ANA);
    await addToCart(page, 'nft-001', 2);
    const routes = ['/', '/nft/nft-001', '/cart', '/profile', '/wallets', '/login', '/register', '/nao-existe'];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const r of routes) {
        await page.goto(r);
        await page.waitForLoadState('networkidle');
        await noOverflow(page, `${r} @${w}`);
      }
    }
  });

  test('pagamento e recibo sem overflow em 320 e 390', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'varre larguras uma vez');
    test.setTimeout(90_000);
    await toCheckout(page);
    for (const w of [320, 390]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/checkout');
      await expect(page.getByLabel('CPF')).toBeVisible();
      await noOverflow(page, `/checkout @${w}`);
    }
  });

  test('zoom 200% (viewport 720px de largura efetiva) mantém todo o conteúdo acessível @layout', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 450 });
    await open(page, '/nft/nft-001');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeVisible();
    await noOverflow(page, 'detalhe com zoom');
  });

  test('tablet (768) usa grade de 3 colunas sem sobrepor a navegação @layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await open(page, '/');
    const cards = page.getByTestId('nft-card');
    await expect(cards.first()).toBeVisible();
    const xs = await cards.evaluateAll((els) => [...new Set(els.slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().left)))]);
    expect(xs.length).toBe(3);
    await noOverflow(page, 'tablet home');
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  });

  test('skeleton do catálogo mantém a altura dos cartões (sem deslocamento de layout)', async ({ page }) => {
    await open(page, '/?scenario=slow');
    const grid = page.getByTestId('catalog-skeleton');
    const sk = grid.getByTestId('card-skeleton').first();
    await expect(sk).toBeVisible();
    const before = (await sk.boundingBox())!;
    const gridH = (await grid.boundingBox())!.height;
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 20_000 });
    const card = (await page.getByTestId('nft-card').first().boundingBox())!;
    expect(Math.abs(card.height - before.height)).toBeLessThanOrEqual(2);
    const real = (await page.getByTestId('nft-grid').boundingBox())!.height;
    expect(Math.abs(real - gridH)).toBeLessThanOrEqual(4);
  });

  test('movimento reduzido desliga o shimmer', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/?scenario=slow');
    const sk = page.getByTestId('catalog-skeleton').getByTestId('card-skeleton').first().locator('[data-skeleton]').first();
    await expect(sk).toBeVisible();
    const anim = await sk.evaluate((el) => { const a = getComputedStyle(el, '::after'); return { name: a.animationName, display: a.display }; });
    expect(anim.display === 'none' || anim.name === 'none').toBe(true);
    await ctx.close();
  });
});
