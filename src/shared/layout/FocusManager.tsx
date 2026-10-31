import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/** A cada troca de rota, move o foco ao conteúdo principal e volta ao topo. */
export function FocusManager() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    document.getElementById('conteudo')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}
