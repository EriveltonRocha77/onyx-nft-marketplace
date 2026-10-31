import { describe, expect, it } from 'vitest';
import { MoneyError, formatEthDisplay, mulInt, parseEth, percentOf, toDecimalString } from './decimal';

describe('decimal ETH em wei', () => {
  it('soma 0.1 + 0.2 sem erro de ponto flutuante', () => {
    expect(toDecimalString(parseEth('0.1') + parseEth('0.2'))).toBe('0.300000000000000000');
  });
  it('parseEth("1") vale 10^18 wei', () => expect(parseEth('1')).toBe(10n ** 18n));
  it.each(['1e-3', '', '-1', '0.1234567890123456789', 'abc', '1,5', ' 1'])('rejeita %j', (v) => {
    expect(() => parseEth(v)).toThrow(MoneyError);
  });
  it('toDecimalString usa 18 casas', () => {
    expect(toDecimalString(parseEth('2'))).toBe('2.000000000000000000');
    expect(toDecimalString(1n)).toBe('0.000000000000000001');
  });
  it('formatEthDisplay remove zeros finais, mínimo 2 casas, sem arredondar', () => {
    expect(formatEthDisplay('0.125000000000000000', 'pt-BR')).toBe('0,125');
    expect(formatEthDisplay('2.000000000000000000', 'pt-BR')).toBe('2,00');
    expect(formatEthDisplay('0.000000000000000001', 'pt-BR')).toBe('0,000000000000000001');
    expect(formatEthDisplay('1234.500000000000000000', 'pt-BR')).toBe('1.234,50');
  });
  it('mulInt rejeita quantidade inválida', () => {
    expect(mulInt(parseEth('0.125'), 2)).toBe(parseEth('0.25'));
    expect(() => mulInt(1n, 1.5)).toThrow(MoneyError);
    expect(() => mulInt(1n, -1)).toThrow(MoneyError);
  });
  it('percentOf arredonda para baixo', () => {
    expect(percentOf(parseEth('0.75'), 1000)).toBe(parseEth('0.075'));
    expect(percentOf(7n, 1000)).toBe(0n);
  });
});
