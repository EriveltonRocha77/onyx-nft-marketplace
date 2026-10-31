import { expect, test } from '@playwright/test';
import { ANA, login, open } from './helpers/app';

test.describe('teclado e foco', () => {
  test('primeiro Tab leva ao link de pular conteúdo e Enter foca o conteúdo', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByTestId('nft-card').first()).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('conteudo');
  });

  test('foco visível em controles alcançados pelo teclado', async ({ page }) => {
    await open(page, '/login');
    await page.getByLabel('E-mail').focus();
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });

  test('navegação client-side move o foco para o conteúdo', async ({ page }) => {
    await open(page, '/');
    await page.getByTestId('nft-card').first().getByRole('link').click();
    await expect(page).toHaveURL(/\/nft\//);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('conteudo');
  });

  test('formulário inválido: foco no resumo de erros e campos ligados às mensagens', async ({ page }) => {
    await open(page, '/login');
    await page.getByLabel('E-mail').fill('invalido');
    await page.getByLabel('Senha').press('Enter');
    await expect(page.getByTestId('form-error-summary')).toBeFocused();
    const email = page.getByLabel('E-mail');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy!.split(' ')[0]!.replace(/:/g, '\\:')}`)).toContainText(/e-mail/i);
  });

  test('menu móvel: foco preso no diálogo, Esc fecha e devolve o foco', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'menu móvel só existe em telas pequenas');
    await open(page, '/');
    const trigger = page.getByRole('button', { name: 'Abrir menu' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('drawer de filtros no mobile: abre, prende o foco e fecha com Esc', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'drawer só existe em telas pequenas');
    await open(page, '/');
    const trigger = page.getByRole('button', { name: /Filtros/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Filtros' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('diálogo de carteira: foco entra, Esc fecha e o foco volta ao botão', async ({ page }) => {
    await open(page, '/');
    await login(page, 'bruno@onyx.test');
    await page.goto('/wallets');
    const trigger = page.getByRole('button', { name: 'Adicionar carteira' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Adicionar carteira' });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('paginação e cartões são operáveis só com teclado', async ({ page }) => {
    await open(page, '/');
    const next = page.getByRole('link', { name: 'Próxima página' });
    await expect(next).toBeVisible();
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/page=2/);
  });

  test('coração de favorito é um botão com estado exposto', async ({ page }) => {
    await open(page, '/');
    await login(page, ANA);
    await page.goto('/nft/nft-001');
    const btn = page.getByTestId('favorite-button');
    await btn.focus();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Space');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
