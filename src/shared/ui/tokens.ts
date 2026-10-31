export const tokens = {
  bg: '#0A0A0B', surface: '#121214', surface2: '#1A1A1E', border: '#2A2A30',
  text: '#F4F4F5', muted: '#A1A1AA', accent: '#C6F432', accentForeground: '#0A0A0B',
  danger: '#FF6B6B', warning: '#F5B342', success: '#4ADE80',
} as const;

export type TokenName = keyof typeof tokens;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) + 0.7152 * channel(parseInt(h.slice(2, 4), 16)) + 0.0722 * channel(parseInt(h.slice(4, 6), 16));
}

export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
