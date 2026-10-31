import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../shared/ui/cn';
import { withFilterChange, type CatalogSearch } from './search';

function pagesToShow(current: number, total: number): (number | 'gap')[] {
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const item = 'grid h-10 min-w-10 place-items-center rounded-lg border border-border px-3 text-sm hover:border-muted';

export function Pagination({ search, totalPages }: { search: CatalogSearch; totalPages: number }) {
  if (totalPages <= 1) return null;
  const go = (page: number) => withFilterChange(search, { page });
  const prev = search.page - 1;
  const next = search.page + 1;
  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {prev >= 1 ? (
        <Link to="/" search={go(prev)} className={item} aria-label="Página anterior"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></Link>
      ) : (
        <span aria-disabled="true" className={cn(item, 'opacity-40')}><ChevronLeft aria-hidden="true" className="h-4 w-4" /><span className="sr-only">Página anterior (indisponível)</span></span>
      )}
      {pagesToShow(search.page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`g${i}`} aria-hidden="true" className="px-1 text-muted">…</span>
        ) : (
          <Link
            key={p}
            to="/"
            search={go(p)}
            aria-label={`Página ${p}`}
            aria-current={p === search.page ? 'page' : undefined}
            className={cn(item, p === search.page && 'border-accent bg-accent text-accent-foreground hover:border-accent')}
          >
            {p}
          </Link>
        ),
      )}
      {next <= totalPages ? (
        <Link to="/" search={go(next)} className={item} aria-label="Próxima página"><ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
      ) : (
        <span aria-disabled="true" className={cn(item, 'opacity-40')}><ChevronRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only">Próxima página (indisponível)</span></span>
      )}
    </nav>
  );
}
