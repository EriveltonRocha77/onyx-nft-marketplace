import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '../../features/auth/api';
import { registerSessionCleanup } from '../../features/auth/session';
import { connectRealtime } from './connect';

/** Mantém uma conexão por identidade (visitante ou usuário). Trocar de usuário encerra a anterior. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { status, user } = useSession();
  const identity = status === 'authenticated' && user ? user.id : status === 'guest' ? 'guest' : null;

  useEffect(() => {
    if (!identity) return;
    const url = import.meta.env.VITE_SOCKET_URL || undefined;
    const dispose = connectRealtime(qc, { ...(url ? { url } : {}), userId: identity === 'guest' ? null : identity });
    const unregister = registerSessionCleanup(dispose);
    return () => { unregister(); dispose(); };
  }, [qc, identity]);

  return <>{children}</>;
}
