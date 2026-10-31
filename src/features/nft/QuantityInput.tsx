import { Minus, Plus } from 'lucide-react';
import { Button } from '../../shared/ui/button';

export const MAX_PER_ORDER = 10;

export function quantityLimit(available: number): number {
  return Math.max(0, Math.min(available, MAX_PER_ORDER));
}

interface Props { value: number; max: number; onChange: (n: number) => void; id?: string }

export function QuantityInput({ value, max, onChange, id = 'quantidade' }: Props) {
  const clamp = (n: number) => Math.min(Math.max(1, Math.trunc(n) || 1), Math.max(1, max));
  const disabled = max < 1;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">Quantidade</label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="icon" aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(clamp(value - 1))}>
          <Minus aria-hidden="true" className="h-4 w-4" />
        </Button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(1, max)}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-11 w-16 rounded-xl border border-border bg-surface text-center text-sm"
        />
        <Button type="button" variant="secondary" size="icon" aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))}>
          <Plus aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted">{max < 1 ? 'Sem unidades disponíveis.' : `Máximo de ${max} por pedido.`}</p>
    </div>
  );
}
