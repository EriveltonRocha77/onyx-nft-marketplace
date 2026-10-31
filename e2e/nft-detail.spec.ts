import { expect, test } from '@playwright/test';
import { open } from './helpers/app';

test.describe('detalhe do NFT', () => {
  test('abre pelo cartão e mostra galeria, preço e quantidade', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('nft-card').first().getByRole('link').click();
    await expect(page).toHaveURL(/\/nft\/nft-/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('gallery')).toBeVisible();
    await expect(page.getByTestId('detail-price')).toContainText('ETH');
    await expect(page.getByRole('spinbutton', { name: 'Quantidade' })).toHaveValue('1');
  });

  test('troca a imagem pelas miniaturas', async ({ page }) => {
    await open(page, '/nft/nft-001');
    const main = page.getByTestId('gallery').locator('img').first();
    const before = await main.getAttribute('src');
    await page.getByRole('button', { name: 'Ver imagem 2' }).click();
    await expect(main).not.toHaveAttribute('src', before!);
  });

  test('limita a quantidade ao estoque (máx. 10)', async ({ page }) => {
    await open(page, '/nft/nft-001');
    const qty = page.getByRole('spinbutton', { name: 'Quantidade' });
    await qty.fill('99');
    const v = Number(await qty.inputValue());
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(10);
  });

  test('NFT esgotado aparece como esgotado e sem quantidade', async ({ page }) => {
    await open(page, '/nft/nft-004');
    await expect(page.getByText('Esgotado').first()).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade' })).toBeDisabled();
  });

  test('NFT inexistente mostra página de não encontrado', async ({ page }) => {
    await open(page, '/nft/nft-999');
    await expect(page.getByText('NFT não encontrado')).toBeVisible();
    await page.getByRole('link', { name: 'Voltar ao catálogo' }).click();
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
  });
});
