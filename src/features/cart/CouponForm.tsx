import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Cart } from '../../shared/api/schemas';
import { Button } from '../../shared/ui/button';
import { FormField } from '../../shared/ui/form-field';
import { Input } from '../../shared/ui/input';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { useApplyCoupon, useRemoveCoupon } from './api';

export function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();
  const announce = useAnnounce();
  const [code, setCode] = useState('');
  const error = apply.error?.fields?.['coupon'] ?? apply.error?.message;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { apply.reset(); apply.mutate({ code: '' }); return; }
    apply.mutate({ code }, { onSuccess: (c) => { setCode(''); announce(`Cupom ${c.coupon?.code ?? ''} aplicado.`); } });
  };

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 text-sm" data-testid="coupon-applied">
        <span>Cupom <strong>{cart.coupon.code}</strong> aplicado</span>
        <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => announce('Cupom removido.') })} aria-label={`Remover cupom ${cart.coupon.code}`}>
          <X aria-hidden="true" className="h-4 w-4" />Remover
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="flex items-start gap-2" aria-label="Cupom">
      <div className="flex-1">
        <FormField label="Cupom de desconto" error={error}>
          {(p) => <Input value={code} onChange={(e) => { setCode(e.target.value); if (apply.isError) apply.reset(); }} autoComplete="off" autoCapitalize="characters" placeholder="ONYX10" {...p} />}
        </FormField>
      </div>
      <Button type="submit" variant="secondary" className="mt-[26px]" disabled={apply.isPending}>{apply.isPending ? 'Aplicando…' : 'Aplicar'}</Button>
    </form>
  );
}
