import { expect, test } from '@playwright/test';
import { ANA, login, open, PASSWORD } from './helpers/app';

test.describe('autenticação', () => {
  test('entra com credenciais válidas e sai', async ({ page }) => {
    await open(page, '/login');
    await page.getByLabel('E-mail').fill(ANA);
    await page.getByLabel('Senha').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
  });

  test('mostra erro de credenciais inválidas sem sair da página', async ({ page }) => {
    await open(page, '/login');
    await page.getByLabel('E-mail').fill(ANA);
    await page.getByLabel('Senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert').first()).toContainText(/credenciais|inválid|senha/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('valida campos vazios com resumo de erros acessível', async ({ page }) => {
    await open(page, '/login');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  test('cria conta nova e entra logada', async ({ page }) => {
    await open(page, '/register');
    await page.getByLabel('Nome', { exact: false }).first().fill('Carla Teste');
    await page.getByLabel('E-mail').fill(`carla${Date.now()}@onyx.test`);
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    const confirm = page.getByLabel(/Confirm/i);
    if (await confirm.count()) await confirm.fill(PASSWORD);
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  });

  test('redireciona para o destino seguro após login e bloqueia redirect externo', async ({ page }) => {
    await open(page, '/login?redirect=https://evil.example');
    await page.getByLabel('E-mail').fill(ANA);
    await page.getByLabel('Senha').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    expect(new URL(page.url()).hostname).toBe('localhost');
  });

  test('sessão persiste após recarregar', async ({ page }) => {
    await open(page, '/');
    await login(page);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  });
});
