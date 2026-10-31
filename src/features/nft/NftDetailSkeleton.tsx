import { Skeleton } from '../../shared/ui/skeleton';

export function NftDetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="grid gap-8 lg:grid-cols-2" data-testid="detail-skeleton">
      <div className="flex flex-col gap-3">
        <Skeleton className="aspect-square w-full" />
        <div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
