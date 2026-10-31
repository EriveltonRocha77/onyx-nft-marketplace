import { toast } from 'sonner';
import { t } from '../i18n';
import { cn } from '../ui/cn';

/** Link de página fora da entrega: informa com clareza, sem simular sucesso nem navegar. */
export function OutOfScopeLink({ children, className }: { children: string; className?: string }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title={t('common.outOfScope')}
      onClick={() => toast.info(`${children}: ${t('common.outOfScope').toLowerCase()}.`)}
      className={cn('text-left text-sm text-muted hover:text-text', className)}
    >
      {children}
    </button>
  );
}
