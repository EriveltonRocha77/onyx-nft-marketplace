import { Link } from '@tanstack/react-router';
import { usePageTitle } from '../shared/layout/usePageTitle';
import { buttonVariants } from '../shared/ui/button';
import { cn } from '../shared/ui/cn';

export function NotFoundPage() {
  usePageTitle('Página não encontrada');
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center" data-testid="not-found">
      <p className="font-display text-6xl text-accent">404</p>
      <h1 className="text-2xl">Página não encontrada</h1>
      <p className="max-w-md text-muted">O endereço que você tentou abrir não existe ou foi movido.</p>
      <Link to="/" className={cn(buttonVariants())}>Voltar ao início</Link>
    </div>
  );
}
