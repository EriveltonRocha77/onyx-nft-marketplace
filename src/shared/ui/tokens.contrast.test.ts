import { describe, expect, it } from 'vitest';
import { contrastRatio, tokens } from './tokens';

describe('contraste dos tokens', () => {
  it('texto principal sobre o fundo >= 7:1', () => expect(contrastRatio(tokens.text, tokens.bg)).toBeGreaterThanOrEqual(7));
  it('texto secundário sobre o fundo >= 4.5:1', () => expect(contrastRatio(tokens.muted, tokens.bg)).toBeGreaterThanOrEqual(4.5));
  it('texto secundário sobre superfície elevada >= 4.5:1', () => expect(contrastRatio(tokens.muted, tokens.surface2)).toBeGreaterThanOrEqual(4.5));
  it('texto sobre o acento >= 7:1', () => expect(contrastRatio(tokens.accentForeground, tokens.accent)).toBeGreaterThanOrEqual(7));
  it('perigo sobre a superfície >= 4.5:1', () => expect(contrastRatio(tokens.danger, tokens.surface)).toBeGreaterThanOrEqual(4.5));
  it('acento sobre o fundo >= 3:1 (anel de foco)', () => expect(contrastRatio(tokens.accent, tokens.bg)).toBeGreaterThanOrEqual(3));
});
