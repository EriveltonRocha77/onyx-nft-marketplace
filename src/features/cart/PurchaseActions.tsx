import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Nft } from '../../shared/api/schemas';
import { Button, buttonVariants } from '../../shared/ui/button';
import { cn } from '../../shared/ui/cn';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { useAddToCart } from './api';

interface Props { nft: Nft; editionId: string; quantity: number; disabled: boolean }

export function PurchaseActions({ nft, editionId, quantity, disabled }: Props) {
  const add = useAddToCart();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const input = { nftId: nft.id, editionId, quantity };

  const onAdd = () => add.mutate(input, {
    onSuccess: () => { announce(`${nft.name} adicionado ao carrinho.`); toast.success(`${nft.name} adicionado ao carrinho.`); },
    onError: (e) => { toast.error(e.message); announce(e.message, 'assertive'); },
  });
  const onBuyNow = () => add.mutate(input, {
    onSuccess: () => { void navigate({ to: '/checkout' }); },
    onError: (e) => { toast.error(e.message); announce(e.message, 'assertive'); },
  });

  return (
    <div className="flex flex-col gap-3" data-testid="purchase-actions">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="flex-1" disabled={disabled || add.isPending} onClick={onBuyNow}>Comprar agora</Button>
        <Button size="lg" variant="secondary" className="flex-1" disabled={disabled || add.isPending} onClick={onAdd}>
          {add.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
        </Button>
      </div>
      {add.isError ? <p role="alert" className="text-sm text-danger">{add.error.message}</p> : null}
      {add.isSuccess ? <Link to="/cart" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'self-start')}>Ver carrinho</Link> : null}
    </div>
  );
}
