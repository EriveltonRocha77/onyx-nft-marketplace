import { forwardRef } from 'react';

interface Props {
  message?: string | null;
  errors: string[];
}

/** Resumo de erros focável: recebe o foco quando o envio é inválido. */
export const FormErrorSummary = forwardRef<HTMLDivElement, Props>(function FormErrorSummary({ message, errors }, ref) {
  if (!message && errors.length === 0) return <div ref={ref} tabIndex={-1} />;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm" data-testid="form-error-summary">
      {message ? <p className="font-medium text-danger">{message}</p> : null}
      {errors.length > 0 ? (
        <ul className="mt-1 list-disc pl-5 text-danger">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      ) : null}
    </div>
  );
});
