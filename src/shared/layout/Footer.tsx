import { OutOfScopeLink } from './OutOfScopeLink';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg">Onyx</p>
          <p className="mt-2 max-w-xs text-sm text-muted">Marketplace de arte digital. Ambiente de demonstração com dados simulados.</p>
        </div>
        <nav aria-label="Explorar" className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium">Explorar</p>
          <OutOfScopeLink>Atividade</OutOfScopeLink>
          <OutOfScopeLink>Ofertas</OutOfScopeLink>
          <OutOfScopeLink>Downloads</OutOfScopeLink>
        </nav>
        <nav aria-label="Ajuda" className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium">Ajuda</p>
          <OutOfScopeLink>Suporte</OutOfScopeLink>
          <OutOfScopeLink>Blog</OutOfScopeLink>
          <a href="https://ethereum.org/pt-br/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-text">
            Sobre Ethereum<span className="sr-only"> (abre em nova aba)</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
