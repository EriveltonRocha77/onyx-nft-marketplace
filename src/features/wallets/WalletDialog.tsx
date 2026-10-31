import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Wallet } from '../../shared/api/schemas';
import { Button } from '../../shared/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '../../shared/ui/dialog';
import { FormErrorSummary } from '../../shared/ui/form-error-summary';
import { FormField } from '../../shared/ui/form-field';
import { Input } from '../../shared/ui/input';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { useApiFormErrors } from '../auth/useAuthForm';
import { ADDRESS_RE, networkLabels, useCreateWallet, useUpdateWallet } from './api';

const schema = z.object({
  label: z.string().trim().min(2, 'Informe um nome com ao menos 2 caracteres.').max(40, 'Use no máximo 40 caracteres.'),
  address: z.string().trim().regex(ADDRESS_RE, 'Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.'),
  network: z.enum(['ethereum', 'polygon', 'base']),
  role: z.enum(['primary', 'secondary']),
});
type Values = z.infer<typeof schema>;

const selectClass = 'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text';

interface Props { wallet?: Wallet; takenRoles: Wallet['role'][]; trigger: ReactNode }

export function WalletDialog({ wallet, takenRoles, trigger }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={wallet ? 'Editar carteira' : 'Adicionar carteira'}>
        <WalletForm wallet={wallet} takenRoles={takenRoles} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function WalletForm({ wallet, takenRoles, onDone }: { wallet: Wallet | undefined; takenRoles: Wallet['role'][]; onDone: () => void }) {
  const create = useCreateWallet();
  const update = useUpdateWallet();
  const announce = useAnnounce();
  const firstFree = (['primary', 'secondary'] as const).find((r) => !takenRoles.includes(r));
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { label: wallet?.label ?? '', address: wallet?.address ?? '', network: wallet?.network ?? 'ethereum', role: wallet?.role ?? firstFree ?? 'primary' },
  });
  const { formError, setFormError, summaryRef, handleApiError, onInvalid, messages } = useApiFormErrors(form);
  const { errors } = form.formState;
  const pending = create.isPending || update.isPending;

  const onValid = async (v: Values) => {
    setFormError(null);
    try {
      if (wallet) await update.mutateAsync({ id: wallet.id, label: v.label, address: v.address, network: v.network });
      else await create.mutateAsync(v);
      announce(wallet ? 'Carteira atualizada.' : 'Carteira adicionada.');
      onDone();
    } catch (e) { handleApiError(e); }
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onValid, onInvalid)} className="flex flex-col gap-4">
      <FormErrorSummary ref={summaryRef} message={formError} errors={messages} />
      <FormField label="Nome da carteira" error={errors.label?.message}>{(p) => <Input autoComplete="off" {...p} {...form.register('label')} />}</FormField>
      <FormField label="Endereço" error={errors.address?.message} hint="Começa com 0x e tem 42 caracteres.">{(p) => <Input autoComplete="off" spellCheck={false} className="font-mono" {...p} {...form.register('address')} />}</FormField>
      <FormField label="Rede padrão" error={errors.network?.message}>
        {(p) => <select className={selectClass} {...p} {...form.register('network')}>{Object.entries(networkLabels).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>}
      </FormField>
      {wallet ? (
        <p className="text-sm text-muted">Tipo: <strong>{wallet.role === 'primary' ? 'Principal' : 'Secundária'}</strong></p>
      ) : (
        <FormField label="Tipo" error={errors.role?.message}>
          {(p) => (
            <select className={selectClass} {...p} {...form.register('role')}>
              <option value="primary" disabled={takenRoles.includes('primary')}>Principal{takenRoles.includes('primary') ? ' (já cadastrada)' : ''}</option>
              <option value="secondary" disabled={takenRoles.includes('secondary')}>Secundária{takenRoles.includes('secondary') ? ' (já cadastrada)' : ''}</option>
            </select>
          )}
        </FormField>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
