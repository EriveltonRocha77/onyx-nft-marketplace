import { expect, test } from '@playwright/test';
import { login, mock, open } from './helpers/app';

test.describe('favoritos', () => {
  test('visitante vê convite para entrar ao filtrar favoritos', async ({ page }) => {
    await open(page, '/?favorites=true');
    await expect(page.getByText('Entre para ver seus favoritos')).toBeVisible();
  });

  test('favorita e desfavorita com atualização otimista', async ({ page }) => {
    await open(page, '/');
    await login(page);
    await page.goto('/nft/nft-001');
    const btn = page.getByTestId('favorite-button');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    const saved = page.waitForResponse((r) => r.url().includes('/api/favorites/') && r.request().method() === 'PUT');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await saved;
    await page.reload();
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('favorite-button').click();
    await expect(page.getByTestId('favorite-button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('reverte quando o servidor falha', async ({ page }) => {
    await open(page, '/');
    await login(page);
    await page.goto('/nft/nft-001');
    const btn = page.getByTestId('favorite-button');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await mock(page, 'failNext', 'PUT /api/favorites', { status: 500, code: 'UNKNOWN' });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText(/não foi possível/i).first()).toBeVisible();
  });

  test('lista só os favoritos da conta', async ({ page }) => {
    await open(page, '/');
    await login(page);
    await page.goto('/?favorites=true');
    await expect(page.getByTestId('nft-card')).toHaveCount(2);
  });
});
