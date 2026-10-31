import { Skeleton } from '../../shared/ui/skeleton';

/** Mesmas dimensões do NftCard para não causar deslocamento de layout. */
export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface" data-testid="card-skeleton">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-1 p-4">
        <div className="flex h-4 items-center"><Skeleton className="h-3 w-1/3" /></div>
        <div className="flex h-6 items-center"><Skeleton className="h-4 w-3/4" /></div>
        <div className="flex h-6 items-center"><Skeleton className="h-4 w-1/2" /></div>
      </div>
    </div>
  );
}

export function CatalogSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando catálogo" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" data-testid="catalog-skeleton">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
