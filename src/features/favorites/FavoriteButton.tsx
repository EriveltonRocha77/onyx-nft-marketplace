import { useLocation, useRouter } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { useSession } from '../auth/api';
import { cn } from '../../shared/ui/cn';
import { useFavorites, useToggleFavorite } from './api';

export function FavoriteButton({ nftId, name, className }: { nftId: string; name: string; className?: string }) {
  const { user } = useSession();
  const router = useRouter();
  const location = useLocation();
  const favorites = useFavorites(user?.id);
  const toggle = useToggleFavorite(user?.id ?? 'anon');
  const active = favorites.data?.nftIds.includes(nftId) ?? false;

  const onClick = () => {
    if (!user) {
      void router.navigate({ to: '/login', search: { redirect: location.href } });
      return;
    }
    toggle.mutate({ nftId, next: !active, name });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      data-testid="favorite-button"
      className={cn('grid h-10 w-10 place-items-center rounded-full border border-border bg-bg/80 backdrop-blur hover:border-accent', className)}
    >
      <Heart aria-hidden="true" className={cn('h-5 w-5', active ? 'fill-accent text-accent' : 'text-text')} />
    </button>
  );
}
