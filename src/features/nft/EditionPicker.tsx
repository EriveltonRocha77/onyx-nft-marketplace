import type { Edition } from '../../shared/api/schemas';
import { formatEthDisplay } from '../../shared/money/decimal';
import { cn } from '../../shared/ui/cn';

export function EditionPicker({ editions, value, onChange }: { editions: Edition[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Edição</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {editions.map((e) => {
          const soldOut = e.available === 0;
          return (
            <label key={e.id} className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm has-[:checked]:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent', soldOut && 'opacity-60')}>
              <span className="flex items-center gap-2">
                <input type="radio" name="edicao" value={e.id} checked={value === e.id} onChange={() => onChange(e.id)} className="accent-[var(--color-accent)]" />
                <span>
                  <span className="block font-medium">{e.label}</span>
                  <span className="block text-xs text-muted">{soldOut ? 'Esgotada' : `${e.available} de ${e.total} disponíveis`}</span>
                </span>
              </span>
              <span className="font-medium">{formatEthDisplay(e.priceEth)} ETH</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
