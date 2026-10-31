import { expect, test } from '@playwright/test';
import { ANA, login, open, PASSWORD } from './helpers/app';

// PNG 1x1 válido
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

test.describe('perfil', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '/');
    await login(page, ANA);
    await page.goto('/profile');
    await expect(page.getByLabel('Nome completo')).toBeVisible();
  });

  test('rota privada redireciona visitante ao login', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await ctx.close();
  });

  test('valida e salva dados, que persistem após refresh', async ({ page }) => {
    await page.getByLabel('Nome completo').fill('A');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByLabel('Nome completo')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Nome completo').fill('Ana Maria Souza');
    await page.getByLabel('Nome de exibição').fill('bruno.lima');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('Este nome de exibição já está em uso.').first()).toBeVisible();
    await page.getByLabel('Nome de exibição').fill('ana.maria');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByTestId('user-name')).toContainText('ana.maria');
    await page.reload();
    await expect(page.getByLabel('Nome completo')).toHaveValue('Ana Maria Souza');
  });

  test('avatar: recusa formato e tamanho inválidos e aceita imagem válida', async ({ page }) => {
    const input = page.getByTestId('avatar-input');
    await input.setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: PNG });
    await expect(page.getByTestId('avatar-error')).toContainText('PNG, JPEG ou WebP');
    await input.setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 10) });
    await expect(page.getByTestId('avatar-error')).toContainText('1 MB');
    await input.setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByTestId('avatar-image')).toHaveAttribute('src', /^data:image\/png/);
    await page.reload();
    await expect(page.getByTestId('avatar-image')).toHaveAttribute('src', /^data:image\/png/);
    await page.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.getByTestId('avatar-placeholder')).toBeVisible();
  });

  test('senha: erros de validação, senha atual errada e troca bem-sucedida', async ({ page }) => {
    await page.getByLabel('Senha atual').fill('x');
    await page.getByLabel('Nova senha', { exact: true }).fill('curta');
    await page.getByLabel('Confirmar nova senha').fill('outra');
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Senha atual').fill('errada1234');
    await page.getByLabel('Nova senha', { exact: true }).fill('Nova#2026a');
    await page.getByLabel('Confirmar nova senha').fill('Nova#2026a');
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await expect(page.getByText('A senha atual está incorreta.').first()).toBeVisible();
    await page.getByLabel('Senha atual').fill(PASSWORD);
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await expect(page.getByLabel('Senha atual')).toHaveValue('');
    await page.getByRole('button', { name: 'Sair' }).click();
    await login(page, ANA, 'Nova#2026a');
  });
});
