import { ExternalLink } from 'lucide-react';
import type { Order } from '../../shared/api/schemas';
import { formatEthDisplay } from '../../shared/money/decimal';
import { Button } from '../../shared/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '../../shared/ui/dialog';
import { SummaryPanel } from '../cart/SummaryPanel';
import { networkLabels } from '../wallets/api';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

export function ExplorerDialog({ txHash, network }: { txHash: string; network: Order['network'] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm"><ExternalLink aria-hidden="true" className="h-4 w-4" />Ver no explorador</Button>
      </DialogTrigger>
      <DialogContent title="Explorador de blocos (simulado)">
        <p className="text-sm text-muted">Esta é uma representação simulada. Nenhuma transação real foi enviada à rede {networkLabels[network]}.</p>
        <dl className="flex flex-col gap-2 text-sm">
          <div><dt className="text-muted">Hash da transação</dt><dd className="font-mono break-all" data-testid="explorer-hash">{txHash}</dd></div>
          <div><dt className="text-muted">Rede</dt><dd>{networkLabels[network]}</dd></div>
          <div><dt className="text-muted">Status</dt><dd>Sucesso (simulado)</dd></div>
        </dl>
        <DialogClose asChild><Button type="button">Fechar</Button></DialogClose>
      </DialogContent>
    </Dialog>
  );
}

/** Recibo: reproduz exatamente o snapshot gravado no pedido. */
export function Receipt({ order }: { order: Order }) {
  const r = order.receipt;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]" data-testid="receipt">
      <section aria-labelledby="itens-titulo" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <h2 id="itens-titulo" className="text-xl">Itens</h2>
        <ul className="flex flex-col divide-y divide-border">
          {r.lines.map((l) => (
            <li key={`${l.nftId}:${l.editionId}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0" data-testid="receipt-line">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-muted">{l.editionLabel} · {l.quantity} × {formatEthDisplay(l.unitPriceEth)} ETH</p>
              </div>
              <p className="shrink-0">{formatEthDisplay(l.lineTotalEth)} ETH</p>
            </li>
          ))}
        </ul>
        <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Pedido</dt><dd className="font-mono break-all" data-testid="receipt-order-id">{order.id}</dd></div>
          <div><dt className="text-muted">Data</dt><dd>{dateFmt.format(new Date(r.confirmedAt ?? r.snapshotAt))}</dd></div>
          <div><dt className="text-muted">Colecionador</dt><dd>{order.collector.name}</dd></div>
          <div><dt className="text-muted">Rede</dt><dd>{networkLabels[r.network]}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted">Carteira</dt><dd className="font-mono break-all">{r.walletAddress}</dd></div>
          {r.txHash ? <div className="sm:col-span-2"><dt className="text-muted">Transação</dt><dd className="font-mono break-all" data-testid="receipt-tx">{r.txHash}</dd></div> : null}
          {r.couponCode ? <div><dt className="text-muted">Cupom</dt><dd>{r.couponCode}</dd></div> : null}
        </dl>
        {r.txHash ? <div className="self-start"><ExplorerDialog txHash={r.txHash} network={r.network} /></div> : null}
      </section>
      <SummaryPanel summary={r.summary} networkLabel={networkLabels[r.network]} />
    </div>
  );
}
