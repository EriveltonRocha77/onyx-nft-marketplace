import { Plug, PlugZap, Pencil, Plus } from 'lucide-react';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import type { Wallet } from '../../shared/api/schemas';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { Skeleton } from '../../shared/ui/skeleton';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { networkLabels, useConnectWallet, useDisconnectWallet, useWallets } from './api';
import { WalletDialog } from './WalletDialog';

export function WalletConnection({ wallet }: { wallet: Wallet }) {
  const connect = useConnectWallet();
  const disconnect = useDisconnectWallet();
  const announce = useAnnounce();
  const busy = connect.isPending || disconnect.isPending;
  return (
    <div className="flex flex-col items-start gap-1">
      {wallet.connected ? (
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => disconnect.mutate(wallet.id, { onSuccess: () => announce(`${wallet.label} desconectada.`) })}>
          <PlugZap aria-hidden="true" className="h-4 w-4" />{busy ? 'Desconectando…' : 'Desconectar'}
        </Button>
      ) : (
        <Button type="button" size="sm" disabled={busy} onClick={() => connect.mutate(wallet.id, { onSuccess: () => announce(`${wallet.label} conectada.`), onError: (e) => announce(e.message, 'assertive') })}>
          <Plug aria-hidden="true" className="h-4 w-4" />{busy ? 'Conectando…' : 'Conectar'}
        </Button>
      )}
      {connect.isError ? <p role="alert" className="text-sm text-danger" data-testid="wallet-error">⚠ {connect.error.message}</p> : null}
    </div>
  );
}

function WalletCard({ wallet, takenRoles }: { wallet: Wallet; takenRoles: Wallet['role'][] }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4" data-testid="wallet-card">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg">{wallet.label}</h2>
        <Badge tone={wallet.role === 'primary' ? 'accent' : 'neutral'}>{wallet.role === 'primary' ? 'Principal' : 'Secundária'}</Badge>
        <Badge tone={wallet.connected ? 'success' : 'neutral'} data-testid="wallet-status">{wallet.connected ? '● Conectada' : '○ Desconectada'}</Badge>
      </div>
      <p className="font-mono text-sm break-all text-muted">{wallet.address}</p>
      <p className="text-sm text-muted">Rede padrão: {networkLabels[wallet.network]}</p>
      <div className="flex flex-wrap items-start gap-2">
        <WalletConnection wallet={wallet} />
        <WalletDialog wallet={wallet} takenRoles={takenRoles} trigger={<Button type="button" variant="ghost" size="sm" aria-label={`Editar ${wallet.label}`}><Pencil aria-hidden="true" className="h-4 w-4" />Editar</Button>} />
      </div>
    </li>
  );
}

export function WalletsPage() {
  usePageTitle('Carteiras');
  const wallets = useWallets();
  const taken = wallets.data?.map((w) => w.role) ?? [];
  const full = taken.length >= 2;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Carteiras</h1>
        {wallets.data && !full ? (
          <WalletDialog takenRoles={taken} trigger={<Button type="button"><Plus aria-hidden="true" className="h-4 w-4" />Adicionar carteira</Button>} />
        ) : null}
      </div>
      <p className="text-sm text-muted">Conexões são simuladas: nenhuma extensão de carteira ou blockchain real é usada.</p>
      {wallets.isPending ? (
        <div role="status" aria-label="Carregando carteiras" className="flex flex-col gap-3" data-testid="wallets-skeleton">
          {[0, 1].map((i) => <Skeleton key={i} className="h-[170px] w-full rounded-2xl" />)}
        </div>
      ) : wallets.isError ? (
        <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} title="Não foi possível carregar as carteiras" />
      ) : wallets.data.length === 0 ? (
        <EmptyState title="Nenhuma carteira cadastrada" description="Adicione uma carteira para pagar seus pedidos." />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Suas carteiras">{wallets.data.map((w) => <WalletCard key={w.id} wallet={w} takenRoles={taken.filter((r) => r !== w.role)} />)}</ul>
      )}
    </div>
  );
}
