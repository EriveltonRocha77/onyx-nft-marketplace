import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { Button } from '../../shared/ui/button';
import { FormErrorSummary } from '../../shared/ui/form-error-summary';
import { FormField } from '../../shared/ui/form-field';
import { Input } from '../../shared/ui/input';
import { useAnnounce } from '../../shared/ui/live-announcer';
import { Skeleton } from '../../shared/ui/skeleton';
import { ErrorState } from '../../shared/ui/states';
import { passwordRule } from '../auth/schemas';
import { useApiFormErrors } from '../auth/useAuthForm';
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateProfile, useUploadAvatar, validateAvatar } from './api';

const profileForm = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(80, 'Use no máximo 80 caracteres.'),
  displayName: z.string().trim().min(2, 'O nome de exibição deve ter ao menos 2 caracteres.').max(30, 'Use no máximo 30 caracteres.').regex(/^[\w.-]+$/, 'Use apenas letras, números, ponto, hífen e sublinhado.'),
  bio: z.string().trim().max(160, 'A bio deve ter no máximo 160 caracteres.'),
});
type ProfileValues = z.infer<typeof profileForm>;

const passwordForm = z
  .object({ currentPassword: z.string().min(1, 'Informe a senha atual.'), newPassword: passwordRule, confirmPassword: z.string().min(1, 'Confirme a nova senha.') })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });
type PasswordValues = z.infer<typeof passwordForm>;

function Card({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <h2 id={id} className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

function AvatarSection({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const announce = useAnnounce();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateAvatar(file);
    setError(problem);
    if (problem) { announce(problem, 'assertive'); return; }
    upload.mutate(file, {
      onSuccess: () => { toast.success('Avatar atualizado.'); announce('Avatar atualizado.'); },
      onError: (e) => setError(e.fields?.['avatar'] ?? e.message),
    });
    if (input.current) input.current.value = '';
  };

  return (
    <Card title="Avatar" id="avatar-titulo">
      <div className="flex items-center gap-4">
        {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${name}`} width={80} height={80} className="h-20 w-20 rounded-full object-cover" data-testid="avatar-image" /> : (
          <div aria-hidden="true" className="grid h-20 w-20 place-items-center rounded-full bg-surface-2 text-2xl text-muted" data-testid="avatar-placeholder">{name.slice(0, 1).toUpperCase()}</div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>{upload.isPending ? 'Enviando…' : 'Trocar avatar'}</Button>
            {avatarUrl ? <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => announce('Avatar removido.') })}>Remover</Button> : null}
          </div>
          <p className="text-xs text-muted">PNG, JPEG ou WebP, até 1 MB.</p>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Arquivo do avatar" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} data-testid="avatar-input" />
      </div>
      {error ? <p role="alert" className="text-sm text-danger" data-testid="avatar-error">⚠ {error}</p> : null}
    </Card>
  );
}

function DataSection({ initial, email }: { initial: ProfileValues; email: string }) {
  const update = useUpdateProfile();
  const announce = useAnnounce();
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileForm), defaultValues: initial });
  const { formError, setFormError, summaryRef, handleApiError, onInvalid, messages } = useApiFormErrors(form);
  const { errors, isDirty } = form.formState;

  const onValid = async (values: ProfileValues) => {
    setFormError(null);
    try {
      const saved = await update.mutateAsync(values);
      form.reset({ name: saved.name, displayName: saved.displayName, bio: saved.bio });
      toast.success('Perfil atualizado.');
      announce('Perfil atualizado.');
    } catch (e) { handleApiError(e); }
  };

  return (
    <Card title="Dados pessoais" id="dados-titulo">
      <form noValidate onSubmit={form.handleSubmit(onValid, onInvalid)} className="flex flex-col gap-4">
        <FormErrorSummary ref={summaryRef} message={formError} errors={messages} />
        <FormField label="Nome completo" error={errors.name?.message}>{(p) => <Input autoComplete="name" {...p} {...form.register('name')} />}</FormField>
        <FormField label="Nome de exibição" error={errors.displayName?.message}>{(p) => <Input autoComplete="nickname" {...p} {...form.register('displayName')} />}</FormField>
        <FormField label="E-mail" hint="O e-mail não pode ser alterado nesta versão.">{(p) => <Input type="email" value={email} readOnly {...p} />}</FormField>
        <FormField label="Bio" error={errors.bio?.message} hint="Até 160 caracteres.">{(p) => <Input {...p} {...form.register('bio')} />}</FormField>
        <Button type="submit" className="self-start" disabled={update.isPending || !isDirty}>{update.isPending ? 'Salvando…' : 'Salvar alterações'}</Button>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const change = useChangePassword();
  const announce = useAnnounce();
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordForm), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const { formError, setFormError, summaryRef, handleApiError, onInvalid, messages } = useApiFormErrors(form);
  const { errors } = form.formState;

  const onValid = async ({ currentPassword, newPassword }: PasswordValues) => {
    setFormError(null);
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      form.reset();
      toast.success('Senha alterada.');
      announce('Senha alterada com sucesso.');
    } catch (e) { handleApiError(e); }
  };

  return (
    <Card title="Alterar senha" id="senha-titulo">
      <form noValidate onSubmit={form.handleSubmit(onValid, onInvalid)} className="flex flex-col gap-4">
        <FormErrorSummary ref={summaryRef} message={formError} errors={messages} />
        <FormField label="Senha atual" error={errors.currentPassword?.message}>{(p) => <Input type="password" autoComplete="current-password" {...p} {...form.register('currentPassword')} />}</FormField>
        <FormField label="Nova senha" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com letra e número.">{(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register('newPassword')} />}</FormField>
        <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>{(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register('confirmPassword')} />}</FormField>
        <Button type="submit" className="self-start" disabled={change.isPending}>{change.isPending ? 'Alterando…' : 'Alterar senha'}</Button>
      </form>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Carregando perfil" className="flex flex-col gap-6" data-testid="profile-skeleton">
      {[120, 380].map((h) => <Skeleton key={h} className="w-full rounded-2xl" style={{ height: h }} />)}
    </div>
  );
}

export function ProfilePage() {
  usePageTitle('Perfil');
  const profile = useProfile();
  const dataKey = profile.data ? `${profile.data.name}|${profile.data.displayName}|${profile.data.bio}` : '';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-3xl">Perfil do colecionador</h1>
      {profile.isPending ? <ProfileSkeleton /> : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} title="Não foi possível carregar o perfil" />
      ) : (
        <>
          <AvatarSection avatarUrl={profile.data.avatarUrl} name={profile.data.displayName} />
          <DataSection key={dataKey} initial={{ name: profile.data.name, displayName: profile.data.displayName, bio: profile.data.bio }} email={profile.data.email} />
          <PasswordSection />
        </>
      )}
    </div>
  );
}
