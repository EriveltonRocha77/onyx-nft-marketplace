import { WifiOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useRealtimeStatus } from '../realtime/status';
import { useAnnounce } from '../ui/live-announcer';

/** Avisa quando o tempo real cai e quando volta; os dados são reconciliados com a API ao reconectar. */
export function ConnectionBanner() {
  const status = useRealtimeStatus();
  const announce = useAnnounce();
  const was = useRef(status);
  useEffect(() => {
    if (was.current === 'connected' && status === 'disconnected') announce('Conexão em tempo real perdida. Tentando reconectar.');
    if (was.current === 'disconnected' && status === 'connected') announce('Conexão restabelecida. Dados atualizados.');
    was.current = status;
  }, [status, announce]);

  if (status !== 'disconnected') return null;
  return (
    <div role="status" className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning" data-testid="connection-banner">
      <WifiOff aria-hidden="true" className="mr-2 inline h-4 w-4" />
      Sem conexão em tempo real. Tentando reconectar; os dados serão atualizados ao voltar.
    </div>
  );
}
