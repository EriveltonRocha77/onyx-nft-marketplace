import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __spike: {
      events: { id: string }[];
      log: string[];
      emitToUser: (e: unknown) => number;
      disconnectAll: (block?: boolean) => void;
      allowConnections: () => void;
      socket: { connected: boolean };
    };
  }
}

const envelope = (n: number) => ({
  id: `evt_${n}`, type: 'nft.updated', version: n + 1, occurredAt: new Date(0).toISOString(), userId: null,
  resource: { kind: 'nft', id: 'nft-001' }, payload: { nft: {} },
});

test('spike: socket.io-client real conecta, recebe evento, reconecta e volta a receber', async ({ page }) => {
  test.skip(process.env.E2E_DEV !== '1', 'o harness do spike só existe no servidor de desenvolvimento');
  await page.goto('/e2e/fixtures/spike.html');
  await expect(page.locator('#out')).toHaveText('pronto');
  await expect.poll(() => page.evaluate(() => window.__spike.socket.connected)).toBe(true);

  await page.evaluate((e) => window.__spike.emitToUser(e), envelope(1));
  await expect.poll(() => page.evaluate(() => window.__spike.events.map((e) => e.id))).toEqual(['evt_1']);

  await page.evaluate(() => window.__spike.disconnectAll());
  await expect.poll(() => page.evaluate(() => window.__spike.log.filter((l) => l.startsWith('disconnect')).length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__spike.socket.connected), { timeout: 15_000 }).toBe(true);

  await page.evaluate((e) => window.__spike.emitToUser(e), envelope(2));
  await expect.poll(() => page.evaluate(() => window.__spike.events.map((e) => e.id))).toEqual(['evt_1', 'evt_2']);
});
