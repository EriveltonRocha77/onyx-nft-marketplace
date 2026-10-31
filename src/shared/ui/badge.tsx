import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'danger' | 'warning' | 'success';
const tones: Record<Tone, string> = {
  neutral: 'border-border bg-surface-2 text-text',
  accent: 'border-accent/40 bg-accent/10 text-accent',
  danger: 'border-danger/50 bg-danger/10 text-danger',
  warning: 'border-warning/50 bg-warning/10 text-warning',
  success: 'border-success/50 bg-success/10 text-success',
};

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone], className)} {...props} />;
}
