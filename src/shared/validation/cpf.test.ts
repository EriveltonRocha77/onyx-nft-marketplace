import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf } from './cpf';

describe('cpf', () => {
  it('aceita CPFs válidos com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });
  it('rejeita dígito errado, tamanho e repetidos', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });
  it('formata progressivamente', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf('5299')).toBe('529.9');
  });
});
