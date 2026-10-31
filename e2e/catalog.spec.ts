import { expect, test } from '@playwright/test';
import { mock, open } from './helpers/app';

test.describe('catálogo', () => {
  test('lista NFTs, destaques e paginação', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
    await expect(page.getByTestId('nft-card')).toHaveCount(12);
    await expect(page.getByTestId('featured')).toBeVisible();
    await expect(page.getByTestId('result-count')).toContainText('48');
  });

  test('estado fica na URL: página, ordenação e busca', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
    await page.getByLabel('Ordenar por').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    await page.getByRole('link', { name: 'Página 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.reload();
    await expect(page.getByLabel('Ordenar por')).toHaveValue('price_asc');
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  });

  test('filtra por categoria e limpa os filtros', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
    const isMobile = (page.viewportSize()?.width ?? 1440) < 1024;
    if (isMobile) await page.getByRole('button', { name: /Filtros/ }).click();
    const scope = isMobile ? page.getByRole('dialog') : page.getByLabel('Filtros do catálogo');
    const select = scope.getByLabel('Categoria');
    const value = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(value!);
    if (isMobile) await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/category=/);
    await expect(page.getByTestId('result-count')).not.toContainText('48 resultados');
    await page.goto('/');
    await expect(page.getByTestId('result-count')).toContainText('48');
  });

  test('busca sem resultado mostra estado vazio com ação de limpar', async ({ page }) => {
    await open(page, '/?q=zzzzinexistente');
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await page.getByTestId('empty-state').getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
  });

  test('página fora do intervalo oferece voltar à primeira', async ({ page }) => {
    await open(page, '/?page=99');
    await expect(page.getByRole('link', { name: 'Ir para a primeira página' })).toBeVisible();
  });

  test('mostra skeleton durante carregamento lento', async ({ page }) => {
    await open(page, '/', 'slow');
    await expect(page.getByTestId('catalog-skeleton')).toBeVisible();
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 20_000 });
  });

  test('erro de servidor mostra mensagem e permite tentar de novo', async ({ page }) => {
    await open(page, '/', 'server-error');
    await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 20_000 });
    await mock(page, 'setScenario', 'default');
    await page.getByRole('button', { name: /Tentar novamente/i }).click();
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
  });
});
