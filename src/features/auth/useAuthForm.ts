import { useRef, useState } from 'react';
import type { FieldErrors, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { ApiError, toApiError } from '../../shared/api/errors';

/** Liga um formulário RHF a erros da API: mapeia `fields`, mostra resumo e move o foco. */
export function useApiFormErrors<T extends FieldValues>(form: UseFormReturn<T>) {
  const [formError, setFormError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const focusSummary = () => setTimeout(() => summaryRef.current?.focus(), 0);

  const handleApiError = (e: unknown): ApiError => {
    const err = toApiError(e);
    if (err.fields) {
      for (const [field, message] of Object.entries(err.fields)) form.setError(field as Path<T>, { type: 'server', message });
      setFormError('Corrija os campos destacados.');
    } else {
      setFormError(err.message);
    }
    focusSummary();
    return err;
  };

  const onInvalid = (_errors: FieldErrors<T>) => { setFormError('Corrija os campos destacados.'); focusSummary(); };

  const messages = Object.values(form.formState.errors).map((e) => (e as { message?: string } | undefined)?.message).filter((m): m is string => Boolean(m));

  return { formError, setFormError, summaryRef, handleApiError, onInvalid, messages };
}
