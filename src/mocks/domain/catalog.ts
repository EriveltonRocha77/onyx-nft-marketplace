import type { Nft } from '../../shared/api/schemas';
import { parseEth, toDecimalString } from '../../shared/money/decimal';
import { getDb, mutate } from '../store';
import { publish } from './events';

export interface NftPatch {
  /** Edição alvo; por padrão, a primeira. */
  editionId?: string;
  priceEth?: string;
  available?: number;
}

/** Altera preço/estoque de um NFT, sobe a versão e publica o evento. REST e socket passam a refletir a mudança. */
export function updateNft(nftId: string, patch: NftPatch): Nft | null {
  if (!getDb().nfts.some((n) => n.id === nftId)) return null;
  mutate((db) => {
    const nft = db.nfts.find((n) => n.id === nftId)!;
    const edition = nft.editions.find((e) => e.id === patch.editionId) ?? nft.editions[0]!;
    if (patch.priceEth !== undefined) edition.priceEth = toDecimalString(parseEth(patch.priceEth));
    if (patch.available !== undefined) edition.available = Math.max(0, Math.min(edition.total, Math.trunc(patch.available)));
    nft.priceFromEth = toDecimalString(nft.editions.map((e) => parseEth(e.priceEth)).reduce((a, b) => (a < b ? a : b)));
    nft.availableTotal = nft.editions.reduce((a, e) => a + e.available, 0);
    nft.version += 1;
  });
  publish({ kind: 'nft', nftId });
  return getDb().nfts.find((n) => n.id === nftId)!;
}
