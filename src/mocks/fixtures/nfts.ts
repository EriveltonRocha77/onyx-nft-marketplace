import { toDecimalString } from '../../shared/money/decimal';
import type { Edition, Nft } from '../../shared/api/schemas/nft';
import { fixtureCategories, fixtureCollections } from './catalog-meta';
import { createPrng } from './prng';

export const NFT_COUNT = 48;
export const SOLD_OUT_INDEXES = [3, 13, 23, 33, 43];

export const nftId = (index: number): string => `nft-${String(index + 1).padStart(3, '0')}`;
export const imageCountFor = (index: number): number => 3 + (index % 2);
export const imagePath = (index: number, k: number): string => `/nfts/nft-${String(index + 1).padStart(3, '0')}-${k + 1}.svg`;

const ADJ = ['Sombrio', 'Cintilante', 'Silente', 'Lunar', 'Elétrico', 'Fractal', 'Etéreo', 'Magnético', 'Prisma', 'Cobalto', 'Névoa', 'Vértice'];
const NOUN = ['Horizonte', 'Pulso', 'Jardim', 'Eco', 'Mosaico', 'Órbita', 'Cascata', 'Sinal', 'Delta', 'Relicário', 'Ressaca', 'Lume'];
const CREATORS = ['Marina Costa', 'Theo Ramos', 'Luna Vidal', 'Caio Nunes', 'Iris Prado', 'Davi Moura'];

function milliToWei(milli: number): string {
  return toDecimalString(BigInt(milli) * 10n ** 15n);
}

export function buildNfts(): Nft[] {
  const rand = createPrng(2026);
  const nfts: Nft[] = [];
  for (let i = 0; i < NFT_COUNT; i++) {
    const collection = fixtureCollections[i % 6]!;
    const category = fixtureCategories[Math.floor(i / 6) % 4]!;
    const soldOut = SOLD_OUT_INDEXES.includes(i);
    const multi = i % 5 === 0;
    const base = 50 + Math.floor(rand() * 3450);
    const labels = multi ? (i % 10 === 0 ? ['Padrão', 'Raro', 'Lendário'] : ['Padrão', 'Raro']) : ['Edição única'];
    const editions: Edition[] = labels.map((label, k) => {
      const total = multi ? 10 - k * 3 : 3 + Math.floor(rand() * 8);
      let available = Math.max(0, total - Math.floor(rand() * total));
      if (soldOut) available = 0;
      if (i === 15 && k === 0) available = 0;
      return { id: `${nftId(i)}-ed${k + 1}`, label, priceEth: milliToWei(Math.round(base * (1 + k * 0.6))), available, total };
    });
    const priceFrom = editions.map((e) => e.priceEth).sort((a, b) => (BigInt(a.replace('.', '')) < BigInt(b.replace('.', '')) ? -1 : 1))[0]!;
    nfts.push({
      id: nftId(i),
      name: `${ADJ[i % ADJ.length]} ${NOUN[(i * 5 + 3) % NOUN.length]} #${i + 1}`,
      description: `Obra digital da coleção ${collection.name}, categoria ${category.name.toLowerCase()}. Peça gerada de forma procedural com paleta limitada e composição geométrica.`,
      collection: { id: collection.id, name: collection.name },
      category: { id: category.id, name: category.name },
      creator: CREATORS[i % CREATORS.length]!,
      images: Array.from({ length: imageCountFor(i) }, (_, k) => imagePath(i, k)),
      editions,
      priceFromEth: priceFrom,
      availableTotal: editions.reduce((acc, e) => acc + e.available, 0),
      featured: i % 8 === 1,
      version: 1,
      createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    });
  }
  return nfts;
}
