import { mkdirSync, writeFileSync } from 'node:fs';
import { fixtureCollections } from '../src/mocks/fixtures/catalog-meta';
import { NFT_COUNT, imageCountFor, imagePath } from '../src/mocks/fixtures/nfts';
import { createPrng } from '../src/mocks/fixtures/prng';

const SIZE = 800;

function art(index: number, k: number): string {
  const rand = createPrng(index * 101 + k * 13 + 7);
  const hue = fixtureCollections[index % 6]!.hue;
  const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${s}% ${l}%)`;
  const parts: string[] = [];
  parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="${hsl(hue, 18, 6 + k * 2)}"/>`);
  const shapes = 7 + Math.floor(rand() * 6);
  for (let s = 0; s < shapes; s++) {
    const cx = Math.round(rand() * SIZE);
    const cy = Math.round(rand() * SIZE);
    const r = Math.round(60 + rand() * 240);
    const fill = hsl(hue + (rand() - 0.5) * 40, 55 + rand() * 30, 25 + rand() * 40);
    const opacity = (0.25 + rand() * 0.55).toFixed(2);
    const kind = Math.floor(rand() * 3);
    if (kind === 0) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`);
    else if (kind === 1) parts.push(`<rect x="${cx - r / 2}" y="${cy - r / 2}" width="${r}" height="${r}" rx="${Math.round(rand() * 40)}" transform="rotate(${Math.round(rand() * 90)} ${cx} ${cy})" fill="${fill}" opacity="${opacity}"/>`);
    else parts.push(`<polygon points="${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}" fill="${fill}" opacity="${opacity}"/>`);
  }
  parts.push(`<circle cx="${Math.round(200 + rand() * 400)}" cy="${Math.round(200 + rand() * 400)}" r="${Math.round(20 + rand() * 40)}" fill="#c6f432"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join('')}</svg>\n`;
}

function avatar(seed: number, hue: number): string {
  const rand = createPrng(seed);
  const bg = `hsl(${hue} 30% 12%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${bg}"/><circle cx="128" cy="104" r="${Math.round(44 + rand() * 8)}" fill="hsl(${hue} 55% 55%)"/><path d="M40 256c0-52 39-88 88-88s88 36 88 88z" fill="#c6f432" opacity="0.9"/></svg>\n`;
}

mkdirSync('public/nfts', { recursive: true });
mkdirSync('public/avatars', { recursive: true });
for (let i = 0; i < NFT_COUNT; i++) {
  for (let k = 0; k < imageCountFor(i); k++) writeFileSync(`public${imagePath(i, k)}`, art(i, k));
}
writeFileSync('public/avatars/ana.svg', avatar(11, 84));
writeFileSync('public/avatars/bruno.svg', avatar(23, 190));
console.log('arte gerada');
