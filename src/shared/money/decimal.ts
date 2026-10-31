export type Wei = bigint;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

const WEI_PER_ETH = 10n ** 18n;
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/;

export function parseEth(value: string): Wei {
  if (!ETH_PATTERN.test(value)) throw new MoneyError(`Valor em ETH inválido: ${JSON.stringify(value)}`);
  const [int = '0', frac = ''] = value.split('.');
  return BigInt(int) * WEI_PER_ETH + BigInt(frac.padEnd(18, '0'));
}

export function toDecimalString(wei: Wei): string {
  if (wei < 0n) throw new MoneyError('Valor negativo não é permitido');
  return `${wei / WEI_PER_ETH}.${(wei % WEI_PER_ETH).toString().padStart(18, '0')}`;
}

export function mulInt(wei: Wei, qty: number): Wei {
  if (!Number.isInteger(qty) || qty < 0) throw new MoneyError(`Quantidade inválida: ${qty}`);
  return wei * BigInt(qty);
}

export function percentOf(wei: Wei, bps: number): Wei {
  if (!Number.isInteger(bps) || bps < 0) throw new MoneyError(`Percentual inválido: ${bps}`);
  return (wei * BigInt(bps)) / 10_000n;
}

export function formatEthDisplay(decimal: string, locale = 'pt-BR'): string {
  if (!ETH_PATTERN.test(decimal)) throw new MoneyError(`Valor em ETH inválido: ${JSON.stringify(decimal)}`);
  const [int = '0', rawFrac = ''] = decimal.split('.');
  let frac = rawFrac.replace(/0+$/, '');
  if (frac.length < 2) frac = frac.padEnd(2, '0');
  const formatter = new Intl.NumberFormat(locale);
  const sep = formatter.formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.';
  return `${formatter.format(BigInt(int))}${sep}${frac}`;
}
