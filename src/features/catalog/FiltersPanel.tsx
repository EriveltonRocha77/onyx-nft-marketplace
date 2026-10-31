import { useState } from 'react';
import type { NftListResponse } from '../../shared/api/schemas';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { FormField } from '../../shared/ui/form-field';
import { hasActiveFilters, type CatalogSearch } from './search';

const PRICE = /^\d+(\.\d{1,18})?$/;
const selectClass = 'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text';

interface Props {
  search: CatalogSearch;
  facets: NftListResponse['facets'] | undefined;
  canFilterFavorites: boolean;
  onChange: (patch: Partial<CatalogSearch>) => void;
  onClear: () => void;
  idPrefix: string;
}

export function FiltersPanel({ search, facets, canFilterFavorites, onChange, onClear, idPrefix }: Props) {
  const [min, setMin] = useState(search.minPrice ?? '');
  const [max, setMax] = useState(search.maxPrice ?? '');
  const [priceError, setPriceError] = useState<string | undefined>();
  const urlPrice = `${search.minPrice ?? ''}|${search.maxPrice ?? ''}`;
  const [syncedPrice, setSyncedPrice] = useState(urlPrice);
  if (syncedPrice !== urlPrice) {
    setSyncedPrice(urlPrice);
    setMin(search.minPrice ?? '');
    setMax(search.maxPrice ?? '');
    setPriceError(undefined);
  }

  const applyPrice = () => {
    const a = min.trim();
    const b = max.trim();
    if ((a && !PRICE.test(a)) || (b && !PRICE.test(b))) {
      setPriceError('Informe valores em ETH, por exemplo 0.5.');
      return;
    }
    setPriceError(undefined);
    if (a !== (search.minPrice ?? '') || b !== (search.maxPrice ?? '')) {
      onChange({ minPrice: a || undefined, maxPrice: b || undefined });
    }
  };

  return (
    <form
      aria-label="Filtros"
      className="flex flex-col gap-5"
      onSubmit={(e) => { e.preventDefault(); applyPrice(); }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-collection`} className="text-sm font-medium">Coleção</label>
        <select id={`${idPrefix}-collection`} className={selectClass} value={search.collection ?? ''} onChange={(e) => onChange({ collection: e.target.value || undefined })}>
          <option value="">Todas as coleções</option>
          {facets?.collections.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-category`} className="text-sm font-medium">Categoria</label>
        <select id={`${idPrefix}-category`} className={selectClass} value={search.category ?? ''} onChange={(e) => onChange({ category: e.target.value || undefined })}>
          <option value="">Todas as categorias</option>
          {facets?.categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
        </select>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Preço (ETH)</legend>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Mínimo" error={priceError}>
            {(p) => <Input inputMode="decimal" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} {...p} />}
          </FormField>
          <FormField label="Máximo">
            {(p) => <Input inputMode="decimal" placeholder="10" value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} {...p} />}
          </FormField>
        </div>
        <Button type="submit" variant="secondary" size="sm">Aplicar preço</Button>
      </fieldset>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={search.availability === 'available'} onChange={(e) => onChange({ availability: e.target.checked ? 'available' : undefined })} />
          Somente disponíveis
        </label>
        {canFilterFavorites ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={Boolean(search.favorites)} onChange={(e) => onChange({ favorites: e.target.checked || undefined })} />
            Somente favoritos
          </label>
        ) : null}
      </div>
      {hasActiveFilters(search) ? <Button type="button" variant="ghost" onClick={onClear}>Limpar filtros</Button> : null}
    </form>
  );
}
