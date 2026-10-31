import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { catalogSearchSchema, normalizeSearch, withFilterChange } from '../../features/catalog/search';
import { cn } from '../ui/cn';

export function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const onHome = useRouterState({ select: (s) => s.location.pathname === '/' });
  const rawSearch = useSearch({ strict: false });
  const current = normalizeSearch(onHome ? catalogSearchSchema.parse(rawSearch) : {});
  const [value, setValue] = useState(current.q);

  // mantém o campo em sincronia com a URL (voltar/avançar no histórico)
  const [syncedQ, setSyncedQ] = useState(current.q);
  if (syncedQ !== current.q) { setSyncedQ(current.q); setValue(current.q); }

  const commit = (replace: boolean) => {
    const q = value.trim();
    if (q === current.q) return;
    void navigate({ to: '/', search: withFilterChange(current, { q }), replace });
  };

  // digitação: atualiza a URL sem poluir o histórico
  useEffect(() => {
    if (!onHome) return;
    const id = setTimeout(() => commit(true), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() === current.q && onHome) return;
    void navigate({ to: '/', search: withFilterChange(current, { q: value.trim() }), replace: false });
  };

  return (
    <form role="search" onSubmit={onSubmit} className={cn('relative', className)}>
      <label className="sr-only" htmlFor="busca-global">Buscar NFTs</label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        id="busca-global"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar NFTs, coleções ou criadores"
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-9 text-sm text-text placeholder:text-muted"
      />
    </form>
  );
}
