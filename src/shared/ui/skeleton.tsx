import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/** Bloco de carregamento com shimmer. O movimento é desligado por `prefers-reduced-motion` (ver index.css). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" data-skeleton className={cn('skeleton', className)} {...props} />;
}
