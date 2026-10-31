import { Skeleton } from '../../shared/ui/skeleton';
import { useFeatured } from './api';
import { CardSkeleton } from './CatalogSkeleton';
import { NftCard } from './NftCard';

export function FeaturedRow() {
  const featured = useFeatured();
  if (featured.isError || (featured.isSuccess && featured.data.length === 0)) return null;
  return (
    <section aria-labelledby="destaques-titulo" data-testid="featured">
      <h2 id="destaques-titulo" className="mb-4 text-2xl">Destaques</h2>
      {featured.isPending ? (
        <div role="status" aria-label="Carregando destaques" className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="w-[240px] shrink-0"><CardSkeleton /></div>)}
          <Skeleton className="hidden" />
        </div>
      ) : (
        <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {featured.data.map((n, i) => (
            <li key={n.id} className="w-[240px] shrink-0 snap-start">
              <NftCard nft={n} priority={i === 0} testId="featured-card" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
