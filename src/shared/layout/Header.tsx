import { Link, useRouter } from '@tanstack/react-router';
import { Menu, ShoppingBag } from 'lucide-react';
import { useLogout, useSession } from '../../features/auth/api';
import { useCartCount } from '../../features/cart/api';
import { t } from '../i18n';
import { Button, buttonVariants } from '../ui/button';
import { cn } from '../ui/cn';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { SearchBox } from './SearchBox';

function Logo() {
  return (
    <span className="flex items-center gap-2 font-display text-xl font-semibold">
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 32 32"><path d="M16 3l11 13-11 13L5 16z" fill="var(--color-accent)" /></svg>
      {t('app.name')}
    </span>
  );
}

const navLink = 'rounded-lg px-3 py-2 text-sm text-muted hover:text-text [&.active]:text-text';

export function Header() {
  const { status, user } = useSession();
  const logout = useLogout();
  const router = useRouter();
  const cartCount = useCartCount();

  const doLogout = () => logout.mutate(undefined, { onSettled: () => void router.navigate({ to: '/' }) });

  const links = (
    <>
      <Link to="/" className={navLink} activeOptions={{ exact: true, includeSearch: false }}>{t('nav.home')}</Link>
      {status === 'authenticated' ? <Link to="/" search={{ favorites: true }} className={navLink}>Favoritos</Link> : null}
      {status === 'authenticated' ? <Link to="/profile" className={navLink}>Perfil</Link> : null}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Onyx, página inicial"><Logo /></Link>
        <nav aria-label="Principal" className="ml-2 hidden items-center md:flex">{links}</nav>
        <SearchBox className="mx-2 hidden max-w-md flex-1 md:block" />
        <div className="ml-auto flex items-center gap-2">
          <Link to="/cart" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')} aria-label={cartCount ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho'} data-testid="cart-link">
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            {cartCount ? <span aria-hidden="true" className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground" data-testid="cart-count">{cartCount}</span> : null}
          </Link>
          {status === 'authenticated' && user ? (
            <>
              <span className="hidden items-center gap-2 text-sm sm:flex" data-testid="user-name">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full" /> : null}
                {user.displayName}
              </span>
              <Button variant="secondary" size="sm" onClick={doLogout} disabled={logout.isPending}>{t('nav.logout')}</Button>
            </>
          ) : status === 'loading' ? null : (
            <>
              <Link to="/login" search={{}} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>{t('nav.login')}</Link>
              <Link to="/register" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}>{t('nav.register')}</Link>
            </>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu"><Menu aria-hidden="true" className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent title="Menu" side="sheet">
              <nav aria-label="Menu móvel" className="flex flex-col gap-1">{links}</nav>
              {status === 'guest' ? <Link to="/register" className={cn(buttonVariants({ variant: 'primary' }))}>{t('nav.register')}</Link> : null}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden"><SearchBox /></div>
    </header>
  );
}
