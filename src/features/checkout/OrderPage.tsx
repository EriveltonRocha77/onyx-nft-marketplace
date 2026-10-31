import { Link } from '@tanstack/react-router';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ApiError } from '../../shared/api/errors';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { buttonVariants } from '../../shared/ui/button';
import { cn } from '../../shared/ui/cn';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { Skeleton } from '../../shared/ui/skeleton';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { useOrder } from './api';
import { Receipt } from './Receipt';

export function OrderPage({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  const announce = useAnnounce();
  const status = order.data?.status;
  usePageTitle(status === 'confirmed' ? 'Pedido confirmado' : status === 'declined' ? 'Pagamento recusado' : 'Pedido');

  const last = useRef(status);
  useEffect(() => {
    if (last.current === 'pending' && status === 'confirmed') announce('Pedido confirmado.', 'assertive');
    if (last.current === 'pending' && status === 'declined') announce('Pagamento recusado.', 'assertive');
    last.current = status;
  }, [status, announce]);

  if (order.isPending) {
    return (
      <div role="status" aria-label="Carregando pedido" className="flex flex-col gap-4" data-testid="order-skeleton">
        <Skeleton className="h-10 w-1/2" /><Skeleton className="h-[320px] w-full rounded-2xl" />
      </div>
    );
  }
  if (order.isError && !order.data) {
    if (order.error instanceof ApiError && order.error.status === 404) {
      return <EmptyState title="Pedido não encontrado" description="Ele não existe ou pertence a outra conta." action={<Link to="/" className={cn(buttonVariants())}>Voltar ao catálogo</Link>} />;
    }
    return <ErrorState error={order.error} onRetry={() => void order.refetch()} title="Não foi possível carregar o pedido" />;
  }
  const o = order.data!;

  return (
    <div className="flex flex-col gap-6">
      {order.isError ? (
        <p role="status" className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning" data-testid="order-offline">
          Sem conexão com o servidor. Seu pedido está seguro e vamos tentar novamente.
        </p>
      ) : null}
      {o.status === 'pending' ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center" role="status" data-testid="order-pending">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-accent motion-reduce:animate-none" />
          <h1 className="text-2xl">Processando pagamento…</h1>
          <p className="max-w-md text-sm text-muted">Estamos aguardando a confirmação. Você pode recarregar a página ou voltar depois: este pedido não será duplicado.</p>
          <p className="font-mono text-xs text-muted">{o.id}</p>
        </div>
      ) : o.status === 'confirmed' ? (
        <>
          <div className="flex items-center gap-3" data-testid="order-confirmed">
            <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-success" />
            <h1 className="text-3xl">Pedido confirmado</h1>
          </div>
          <Receipt order={o} />
          <Link to="/" className={cn(buttonVariants({ variant: 'secondary' }), 'self-start')}>Continuar comprando</Link>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-surface p-6" role="alert" data-testid="order-declined">
            <div className="flex items-center gap-3"><XCircle aria-hidden="true" className="h-8 w-8 text-danger" /><h1 className="text-3xl">Pagamento recusado</h1></div>
            <p className="text-muted">{o.declineReason ?? 'O pagamento não foi aprovado.'}</p>
            <p className="text-sm text-muted">Nenhuma cobrança foi feita e seus itens continuam no carrinho.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/checkout" className={cn(buttonVariants())}>Tentar novamente</Link>
              <Link to="/cart" className={cn(buttonVariants({ variant: 'secondary' }))}>Ver carrinho</Link>
            </div>
          </div>
          <Receipt order={o} />
        </>
      )}
    </div>
  );
}
