import { Link, useNavigate } from '@tanstack/react-router';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect } from 'react';
import { useSession } from '../auth/api';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { Button, buttonVariants } from '../../shared/ui/button';
import { cn } from '../../shared/ui/cn';
import { Dialog, DialogContent, DialogTrigger } from '../../shared/ui/dialog';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { EmptyState, ErrorState } from '../../shared/ui/states';
import { useNftList } from './api';
import { CatalogSkeleton } from './CatalogSkeleton';
import { FeaturedRow } from './FeaturedRow';
import { FiltersPanel } from './FiltersPanel';
import { NftCard } from './NftCard';
import { Pagination } from './Pagination';
import { hasActiveFilters, normalizeSearch, withFilterChange, type CatalogSearch, type RawSearch, type Sort } from './search';

const sortLabels: Record<Sort, string> = {
  newest: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name: 'Nome (A–Z)',
};

export function CatalogPage({ raw }: { raw: RawSearch }) {
  usePageTitle('Início');
  const search: CatalogSearch = normalizeSearch(raw);
  const navigate = useNavigate({ from: '/' });
  const announce = useAnnounce();
  const { status } = useSession();
  const needsLogin = Boolean(search.favorites) && status === 'guest';
  const list = useNftList(search, !search.favorites || status === 'authenticated');
  const filtered = hasActiveFilters(search);
  const showHero = !filtered && search.page === 1;

  const setSearch = (patch: Partial<CatalogSearch>) => { void navigate({ search: withFilterChange(search, patch) }); };
  const clear = () => { void navigate({ search: {} }); };

  const total = list.data?.total;
  useEffect(() => {
    if (total !== undefined) announce(total === 1 ? '1 NFT encontrado.' : `${total} NFTs encontrados.`);
  }, [total, announce]);

  const activeCount = [search.collection, search.category, search.minPrice || search.maxPrice, search.availability === 'available', search.favorites].filter(Boolean).length;
  const panel = (prefix: string) => (
    <FiltersPanel search={search} facets={list.data?.facets} canFilterFavorites={status === 'authenticated'} onChange={setSearch} onClear={clear} idPrefix={prefix} />
  );

  return (
    <div className="flex flex-col gap-10">
      <header className={showHero ? 'flex flex-col gap-3 pt-4' : 'sr-only'}>
        <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">Descubra e colecione <span className="text-accent">arte digital</span></h1>
        {showHero ? <p className="max-w-xl text-muted">Obras originais, edições limitadas e criadores independentes em um só lugar.</p> : null}
      </header>

      {showHero ? <FeaturedRow /> : null}

      <section aria-labelledby="catalogo-titulo">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="catalogo-titulo" className="text-2xl">Catálogo</h2>
            <p className="mt-1 h-5 text-sm text-muted" data-testid="result-count">
              {list.data ? `${list.data.total} ${list.data.total === 1 ? 'resultado' : 'resultados'}` : ' '}
              {list.isFetching && !list.isPending ? <span className="ml-2 text-accent" data-testid="refreshing">Atualizando…</span> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="ordenar" className="text-sm text-muted">Ordenar por</label>
              <select id="ordenar" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" value={search.sort} onChange={(e) => setSearch({ sort: e.target.value as Sort })}>
                {(Object.keys(sortLabels) as Sort[]).map((s) => <option key={s} value={s}>{sortLabels[s]}</option>)}
              </select>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="lg:hidden"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filtros{activeCount ? ` (${activeCount})` : ''}</Button>
              </DialogTrigger>
              <DialogContent title="Filtros" side="sheet">{panel('m')}</DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label="Filtros do catálogo">{panel('d')}</aside>
          <div>
            {needsLogin ? (
              <EmptyState
                title="Entre para ver seus favoritos"
                description="Seus favoritos ficam salvos na sua conta."
                action={<Link to="/login" search={{ redirect: '/?favorites=true' }} className={cn(buttonVariants())}>Entrar</Link>}
              />
            ) : list.isPending ? (
              <CatalogSkeleton />
            ) : list.isError ? (
              <ErrorState error={list.error} onRetry={() => void list.refetch()} title="Não foi possível carregar o catálogo" />
            ) : list.data.items.length === 0 ? (
              list.data.total > 0 ? (
                <EmptyState
                  title="Esta página não existe"
                  description={`O catálogo tem ${list.data.totalPages} páginas para estes filtros.`}
                  action={<Link to="/" search={withFilterChange(search, { page: 1 })} className={cn(buttonVariants())}>Ir para a primeira página</Link>}
                />
              ) : (
                <EmptyState
                  title="Nenhum NFT encontrado"
                  description={filtered ? 'Tente remover alguns filtros ou buscar por outro termo.' : 'O catálogo está vazio no momento.'}
                  action={filtered ? <Button onClick={clear}>Limpar filtros</Button> : undefined}
                />
              )
            ) : (
              <>
                <ul aria-busy={list.isPlaceholderData} className={cn('grid grid-cols-2 gap-4 transition-opacity md:grid-cols-3 xl:grid-cols-4', list.isPlaceholderData && 'opacity-60')} data-testid="nft-grid">
                  {list.data.items.map((n) => <li key={n.id}><NftCard nft={n} /></li>)}
                </ul>
                <Pagination search={search} totalPages={list.data.totalPages} />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
