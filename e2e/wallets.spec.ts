import { expect, test } from '@playwright/test';
import { BRUNO, login, mock, open } from './helpers/app';

const ADDR = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

test.describe('carteiras', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '/');
    await login(page, BRUNO);
    await page.goto('/wallets');
    await expect(page.getByTestId('wallet-card')).toHaveCount(1);
  });

  test('cadastra carteira secundária com validação de endereço e duplicidade', async ({ page }) => {
    await page.getByRole('button', { name: 'Adicionar carteira' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome da carteira').fill('Cofre');
    await dialog.getByLabel('Endereço').fill('0x123');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialog.getByText(/Endereço inválido/).first()).toBeVisible();
    await dialog.getByLabel('Endereço').fill('0x2546BcD3c84621e976D8185a91A922aE77ECEc30');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialog.getByText('Este endereço já está cadastrado.').first()).toBeVisible();
    await dialog.getByLabel('Endereço').fill(ADDR);
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByTestId('wallet-card')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Adicionar carteira' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('wallet-card')).toHaveCount(2);
  });

  test('edita nome e rede e persiste após refresh', async ({ page }) => {
    await page.getByRole('button', { name: /Editar Carteira principal/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome da carteira').fill('Minha base');
    await dialog.getByLabel('Rede padrão').selectOption('polygon');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('heading', { name: 'Minha base' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Minha base' })).toBeVisible();
    await expect(page.getByText('Rede padrão: Polygon')).toBeVisible();
  });

  test('conecta e desconecta (simulado)', async ({ page }) => {
    await expect(page.getByTestId('wallet-status')).toContainText('Desconectada');
    await page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await expect(page.getByTestId('wallet-status')).toContainText('Conectada');
    await page.getByRole('button', { name: 'Desconectar' }).click();
    await expect(page.getByTestId('wallet-status')).toContainText('Desconectada');
  });

  test('conexão recusada mostra erro e permite tentar de novo', async ({ page }) => {
    await mock(page, 'setScenario', 'wallet-refused');
    await page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await expect(page.getByTestId('wallet-error')).toContainText('recusou');
    await expect(page.getByTestId('wallet-status')).toContainText('Desconectada');
    await mock(page, 'setScenario', 'default');
    await page.getByRole('button', { name: 'Conectar', exact: true }).click();
    await expect(page.getByTestId('wallet-status')).toContainText('Conectada');
  });
});
