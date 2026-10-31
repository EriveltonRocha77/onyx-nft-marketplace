import type { ReactNode } from 'react';
import { ApiError } from '../api/errors';
import { t } from '../i18n';
import { Button } from './button';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center" data-testid="empty-state">
      <h2 className="text-xl">{title}</h2>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Algo deu errado. Tente novamente.';
}

export function ErrorState({ error, onRetry, title = 'Não foi possível carregar' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-surface px-6 py-12 text-center" data-testid="error-state">
      <h2 className="text-xl text-danger">{title}</h2>
      <p className="max-w-md text-sm text-muted">{errorMessage(error)}</p>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>{t('common.retry')}</Button> : null}
    </div>
  );
}
