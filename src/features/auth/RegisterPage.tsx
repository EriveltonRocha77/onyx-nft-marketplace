import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { FormErrorSummary } from '../../shared/ui/form-error-summary';
import { FormField } from '../../shared/ui/form-field';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { useRegister } from './api';
import { registerSchema, type RegisterValues } from './schemas';
import { safeRedirect } from './session';
import { useApiFormErrors } from './useAuthForm';

export function RegisterPage({ redirectTo }: { redirectTo?: string | undefined }) {
  usePageTitle('Criar conta');
  const router = useRouter();
  const register = useRegister();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', displayName: '', email: '', password: '', confirmPassword: '' },
  });
  const { formError, setFormError, summaryRef, handleApiError, onInvalid, messages } = useApiFormErrors(form);
  const { errors } = form.formState;

  const onValid = async ({ confirmPassword: _c, displayName, ...rest }: RegisterValues) => {
    setFormError(null);
    try {
      await register.mutateAsync({ ...rest, ...(displayName ? { displayName } : {}) });
      router.history.push(safeRedirect(redirectTo));
    } catch (e) { handleApiError(e); }
  };

  return (
    <div className="mx-auto w-full max-w-md py-8">
      <h1 className="text-3xl">Criar conta</h1>
      <p className="mt-2 text-sm text-muted">Comece sua coleção em poucos passos.</p>
      <form noValidate onSubmit={form.handleSubmit(onValid, onInvalid)} className="mt-6 flex flex-col gap-4">
        <FormErrorSummary ref={summaryRef} message={formError} errors={messages} />
        <FormField label="Nome completo" error={errors.name?.message}>
          {(p) => <Input autoComplete="name" {...p} {...form.register('name')} />}
        </FormField>
        <FormField label="Nome de exibição (opcional)" error={errors.displayName?.message} hint="Como seu nome aparece para outros colecionadores.">
          {(p) => <Input autoComplete="nickname" {...p} {...form.register('displayName')} />}
        </FormField>
        <FormField label="E-mail" error={errors.email?.message}>
          {(p) => <Input type="email" autoComplete="email" {...p} {...form.register('email')} />}
        </FormField>
        <FormField label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres, com letra e número.">
          {(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register('password')} />}
        </FormField>
        <FormField label="Confirmar senha" error={errors.confirmPassword?.message}>
          {(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register('confirmPassword')} />}
        </FormField>
        <Button type="submit" size="lg" disabled={register.isPending}>{register.isPending ? 'Criando…' : 'Criar conta'}</Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Já tem conta? <Link to="/login" search={redirectTo ? { redirect: redirectTo } : {}} className="text-accent underline underline-offset-4">Entrar</Link>
      </p>
    </div>
  );
}
