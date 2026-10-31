import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { FormErrorSummary } from '../../shared/ui/form-error-summary';
import { FormField } from '../../shared/ui/form-field';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { usePageTitle } from '../../shared/layout/usePageTitle';
import { useLogin } from './api';
import { loginSchema, type LoginValues } from './schemas';
import { safeRedirect } from './session';
import { useApiFormErrors } from './useAuthForm';

export function LoginPage({ redirectTo, reason }: { redirectTo?: string | undefined; reason?: string | undefined }) {
  usePageTitle('Entrar');
  const router = useRouter();
  const login = useLogin();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { formError, setFormError, summaryRef, handleApiError, onInvalid, messages } = useApiFormErrors(form);
  const { errors } = form.formState;

  const onValid = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      router.history.push(safeRedirect(redirectTo));
    } catch (e) { handleApiError(e); }
  };

  return (
    <div className="mx-auto w-full max-w-md py-8">
      <h1 className="text-3xl">Entrar</h1>
      <p className="mt-2 text-sm text-muted">Acesse sua coleção, carrinho e favoritos.</p>
      {reason === 'expired' ? (
        <p role="status" className="mt-4 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning" data-testid="session-expired-notice">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      ) : null}
      <form noValidate onSubmit={form.handleSubmit(onValid, onInvalid)} className="mt-6 flex flex-col gap-4">
        <FormErrorSummary ref={summaryRef} message={formError} errors={messages} />
        <FormField label="E-mail" error={errors.email?.message}>
          {(p) => <Input type="email" autoComplete="email" {...p} {...form.register('email')} />}
        </FormField>
        <FormField label="Senha" error={errors.password?.message}>
          {(p) => <Input type="password" autoComplete="current-password" {...p} {...form.register('password')} />}
        </FormField>
        <Button type="submit" size="lg" disabled={login.isPending}>{login.isPending ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Ainda não tem conta? <Link to="/register" search={redirectTo ? { redirect: redirectTo } : {}} className="text-accent underline underline-offset-4">Criar conta</Link>
      </p>
    </div>
  );
}
