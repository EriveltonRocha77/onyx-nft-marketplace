import { Link } from '@tanstack/react-router';
import { Trash2, Minus, Plus } from 'lucide-react';
import { useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { formatEthDisplay } from '../../shared/money/decimal';
import { Button, buttonVariants } from '../../shared/ui/button';
import { cn } from '../../shared/ui/cn';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { Skeleton } from '../../shared/ui/skeleton';
import type { Cart, CartItem } from '../../shared/api/schemas';
import { useCart, useRemoveCartItem, useUpdateCartItem } from './api';
import { CouponForm } from './CouponForm';
import { SummaryPanel } from './SummaryPanel';
import { useCartChanges } from './useCartChanges';

const networkLabels = { ethereum: 'Ethereum', polygon: 'Polygon', base: 'Base' } as const;

export function lineLimit(item: CartItem): number {
  return Math.max(0, Math.min(item.available, 10));
}
export function hasBlockingIssue(cart: Cart): boolean {
  return cart.items.some((i) => i.available === 0 || i.quantity > i.available);
}

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="flex flex-col gap-3" data-testid="cart-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-[120px] items-center gap-4 rounded-2xl border border-border bg-surface p-3">
          <Skeleton className="h-24 w-24 shrink-0" />
          <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/4" /></div>
        </div>
      ))}
    </div>
  );
}

function Line({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const announce = useAnnounce();
  const limit = lineLimit(item);
  const issue = item.available === 0 ? 'Esgotado. Remova este item para continuar.' : item.quantity > item.available ? `Só há ${item.available} disponível(is). Reduza a quantidade.` : null;
  const set = (q: number) => update.mutate({ itemId: item.id, quantity: q }, {
    onError: (e) => toast.error(e.message),
    onSuccess: () => announce(`Quantidade de ${item.name}: ${q}.`),
  });
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-surface p-3" data-testid="cart-item" data-nft-id={item.nftId}>
      <img src={item.image} alt="" width={96} height={96} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="block truncate font-medium hover:text-accent">{item.name}</Link>
            <p className="text-xs text-muted">{item.editionLabel} · {formatEthDisplay(item.unitPriceEth)} ETH cada</p>
          </div>
          <p className="shrink-0 font-medium" data-testid="line-total">{formatEthDisplay(item.lineTotalEth)} ETH</p>
        </div>
        {issue ? <p role="alert" className="text-sm text-warning" data-testid="line-issue">⚠ {issue}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${item.name}`}>
            <Button type="button" variant="secondary" size="icon" className="h-9 w-9" aria-label={`Diminuir quantidade de ${item.name}`} disabled={item.quantity <= 1 || update.isPending} onClick={() => set(item.quantity - 1)}>
              <Minus aria-hidden="true" className="h-4 w-4" />
            </Button>
            <output className="grid h-9 min-w-10 place-items-center text-sm" data-testid="line-qty" aria-live="off">{item.quantity}</output>
            <Button type="button" variant="secondary" size="icon" className="h-9 w-9" aria-label={`Aumentar quantidade de ${item.name}`} disabled={item.quantity >= limit || update.isPending} onClick={() => set(item.quantity + 1)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} aria-label={`Remover ${item.name} do carrinho`}
            onClick={() => remove.mutate({ itemId: item.id }, { onSuccess: () => announce(`${item.name} removido do carrinho.`), onError: (e) => toast.error(e.message) })}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />Remover
          </Button>
        </div>
      </div>
    </li>
  );
}

export function CartPage() {
  usePageTitle('Carrinho');
  const cart = useCart();
  const { changes, dismiss } = useCartChanges(cart.data);
  const mutating = useIsMutating() > 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">Carrinho</h1>
      {changes.length ? (
        <div role="region" aria-label="Alterações no carrinho" className="flex items-start justify-between gap-3 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm" data-testid="cart-changes">
          <ul className="flex flex-col gap-1">{changes.map((c) => <li key={c.id}>{c.text}</li>)}</ul>
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>Entendi</Button>
        </div>
      ) : null}
      {cart.isError && !cart.data ? (
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o carrinho" />
      ) : cart.isPending ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><CartSkeleton /><SummaryPanel summary={undefined} /></div>
      ) : cart.data.items.length === 0 ? (
        <EmptyState title="Seu carrinho está vazio" description="Explore o catálogo e adicione NFTs para comprar." action={<Link to="/" className={cn(buttonVariants())}>Explorar catálogo</Link>} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <ul className="flex flex-col gap-3" aria-label="Itens do carrinho">{cart.data.items.map((i) => <Line key={i.id} item={i} />)}</ul>
          <SummaryPanel summary={cart.data.summary} networkLabel={networkLabels[cart.data.network]} busy={mutating || cart.isFetching}>
            <CouponForm cart={cart.data} />
            {hasBlockingIssue(cart.data) ? (
              <Button disabled size="lg">Resolva os itens indisponíveis</Button>
            ) : (
              <Link to="/checkout" className={cn(buttonVariants({ size: 'lg' }))} data-testid="go-checkout">Ir para o pagamento</Link>
            )}
          </SummaryPanel>
        </div>
      )}
    </div>
  );
}
