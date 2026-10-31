import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { t } from '../i18n';
import { cn } from './cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface ContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title: string;
  description?: string;
  /** `sheet` ancora o painel à direita (usado como drawer de filtros no mobile). */
  side?: 'center' | 'sheet';
  children: ReactNode;
}

/** Diálogo modal: o Radix prende o foco, fecha com Esc e devolve o foco ao gatilho. */
export function DialogContent({ title, description, side = 'center', className, children, ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <DialogPrimitive.Content
        aria-describedby={description ? undefined : undefined}
        className={cn(
          'fixed z-50 flex flex-col gap-4 border border-border bg-surface p-6 text-text shadow-2xl',
          side === 'center'
            ? 'top-1/2 left-1/2 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl'
            : 'inset-y-0 right-0 w-[min(92vw,380px)] overflow-y-auto',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <DialogPrimitive.Title className="text-xl">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label={t('common.close')} className="rounded-lg p-2 hover:bg-surface-2">
            <X aria-hidden="true" className="h-5 w-5" />
          </DialogPrimitive.Close>
        </div>
        {description ? <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description> : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
