import type { ReactNode } from 'react';
import type { SummaryDto } from '../../shared/api/schemas';
import { formatEthDisplay } from '../../shared/money/decimal';
import { Skeleton } from '../../shared/ui/skeleton';

const eth = (v: string) => `${formatEthDisplay(v)} ETH`;

/** Mostra exatamente os valores devolvidos pela API; nada é recalculado na interface. */
export function SummaryPanel({ summary, networkLabel, busy = false, children }: { summary: SummaryDto | undefined; networkLabel?: string; busy?: boolean; children?: ReactNode }) {
  return (
    <section aria-labelledby="resumo-titulo" aria-busy={busy || !summary} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5" data-testid="summary">
      <h2 id="resumo-titulo" className="text-xl">Resumo</h2>
      {summary ? (
        <dl className={busy ? 'flex flex-col gap-3 opacity-60 transition-opacity' : 'flex flex-col gap-3 transition-opacity'}>
          <Row label="Subtotal" value={eth(summary.subtotalEth)} testId="summary-subtotal" />
          {summary.discountEth !== '0' && Number(summary.discountEth) > 0 ? <Row label="Desconto" value={`− ${eth(summary.discountEth)}`} testId="summary-discount" /> : null}
          <Row label={networkLabel ? `Taxa de rede (${networkLabel})` : 'Taxa de rede'} value={eth(summary.networkFeeEth)} testId="summary-fee" />
          <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="text-xl font-semibold" data-testid="summary-total">{eth(summary.totalEth)}</dd>
          </div>
        </dl>
      ) : (
        <div role="status" aria-label="Carregando resumo" className="flex flex-col gap-3" data-testid="summary-skeleton">
          {[0, 1, 2].map((i) => <div key={i} className="flex h-6 items-center justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /></div>)}
          <div className="mt-1 flex h-9 items-center justify-between border-t border-border pt-3"><Skeleton className="h-5 w-12" /><Skeleton className="h-6 w-28" /></div>
        </div>
      )}
      {children}
    </section>
  );
}

function Row({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex h-6 items-center justify-between text-sm">
      <dt className="text-muted">{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  );
}
