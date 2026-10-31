import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiError } from '../../shared/api/errors';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { formatEthDisplay } from '../../shared/money/decimal';
import { Badge } from '../../shared/ui/badge';
import { buttonVariants } from '../../shared/ui/button';
import { cn } from '../../shared/ui/cn';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { FavoriteButton } from '../favorites/FavoriteButton';
import { useNft } from './api';
import { useNftChanges } from './useNftChanges';
import { PurchaseActions } from '../cart/PurchaseActions';
import { EditionPicker } from './EditionPicker';
import { Gallery } from './Gallery';
import { NftDetailSkeleton } from './NftDetailSkeleton';
import { QuantityInput, quantityLimit } from './QuantityInput';

export function NftDetailPage({ nftId }: { nftId: string }) {
  const nft = useNft(nftId);
  const { notes, dismiss } = useNftChanges(nft.data);
  usePageTitle(nft.data?.name ?? 'NFT');
  const [pickedEdition, setPickedEdition] = useState<string>('');
  const [pickedQty, setPickedQty] = useState(1);

  const editions = nft.data?.editions;
  const edition = editions?.find((e) => e.id === pickedEdition) ?? editions?.find((e) => e.available > 0) ?? editions?.[0];
  const editionId = edition?.id ?? '';
  const limit = quantityLimit(edition?.available ?? 0);
  const quantity = Math.min(Math.max(1, pickedQty), Math.max(1, limit));

  if (nft.isPending) return <NftDetailSkeleton />;
  if (nft.isError) {
    if (nft.error instanceof ApiError && nft.error.status === 404) {
      return (
        <EmptyState
          title="NFT não encontrado"
          description="Ele pode ter sido removido ou o link está incorreto."
          action={<Link to="/" className={cn(buttonVariants())}>Voltar ao catálogo</Link>}
        />
      );
    }
    return <ErrorState error={nft.error} onRetry={() => void nft.refetch()} title="Não foi possível carregar o NFT" />;
  }

  const n = nft.data;
  const soldOut = n.availableTotal === 0 || !edition || edition.available === 0;

  return (
    <article className="grid gap-8 lg:grid-cols-2" data-testid="nft-detail">
      <Gallery images={n.images} name={n.name} />
      <div className="flex flex-col gap-6">
        <nav aria-label="Navegação estrutural" className="text-sm text-muted">
          <Link to="/" className="hover:text-text">Início</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/" search={{ collection: n.collection.id }} className="hover:text-text">{n.collection.name}</Link>
        </nav>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl">{n.name}</h1>
            <p className="mt-1 text-sm text-muted">Por {n.creator} · {n.category.name}</p>
          </div>
          <FavoriteButton nftId={n.id} name={n.name} />
        </div>
        {notes.length ? (
          <div role="region" aria-label="Atualizações deste NFT" className="flex items-start justify-between gap-3 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm" data-testid="nft-changes">
            <ul className="flex flex-col gap-1">{notes.map((x) => <li key={x}>{x}</li>)}</ul>
            <button type="button" className="shrink-0 text-xs underline underline-offset-4" onClick={dismiss}>Entendi</button>
          </div>
        ) : null}
        <p className="text-muted">{n.description}</p>
        {n.editions.length > 1 ? <EditionPicker editions={n.editions} value={editionId} onChange={setPickedEdition} /> : null}
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
          <div>
            <p className="text-xs text-muted">Preço</p>
            <p className="text-2xl font-semibold" data-testid="detail-price">{edition ? formatEthDisplay(edition.priceEth) : formatEthDisplay(n.priceFromEth)} ETH</p>
          </div>
          {soldOut ? <Badge tone="danger">Esgotado</Badge> : <Badge tone="accent">{edition?.available} disponíveis</Badge>}
        </div>
        <QuantityInput value={quantity} max={limit} onChange={setPickedQty} />
        <PurchaseActions nft={n} editionId={editionId} quantity={quantity} disabled={soldOut} />
      </div>
    </article>
  );
}
