import { Link } from '@tanstack/react-router';
import type { Nft } from '../../shared/api/schemas';
import { formatEthDisplay } from '../../shared/money/decimal';
import { Badge } from '../../shared/ui/badge';
import { FavoriteButton } from '../favorites/FavoriteButton';

export function priceLabel(nft: Nft): string {
  const from = nft.editions.length > 1 ? 'A partir de ' : '';
  return `${from}${formatEthDisplay(nft.priceFromEth)} ETH`;
}

export function NftCard({ nft, priority = false, testId = 'nft-card' }: { nft: Nft; priority?: boolean; testId?: string }) {
  const soldOut = nft.availableTotal === 0;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-muted" data-testid={testId}>
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="flex flex-1 flex-col rounded-2xl after:absolute after:inset-0 after:content-['']">
        <img
          src={nft.images[0]}
          alt={`${nft.name}, da coleção ${nft.collection.name}`}
          width={800}
          height={800}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full bg-surface-2 object-cover"
        />
        <div className="flex flex-col gap-1 p-4">
          <p className="h-4 truncate text-xs text-muted">{nft.collection.name}</p>
          <h3 className="h-6 truncate text-base">{nft.name}</h3>
          <div className="flex h-6 items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{priceLabel(nft)}</span>
            {soldOut ? <Badge tone="danger">Esgotado</Badge> : null}
          </div>
        </div>
      </Link>
      <FavoriteButton nftId={nft.id} name={nft.name} className="absolute top-3 right-3 z-10" />
    </article>
  );
}
