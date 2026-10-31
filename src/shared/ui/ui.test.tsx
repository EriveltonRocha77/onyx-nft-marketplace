import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';
import { LiveAnnouncerProvider, useAnnounce } from './live-announcer';
import { ErrorState } from './states';
import { Skeleton } from './skeleton';
import { FormField } from './form-field';
import { Input } from './input';

function Speaker({ text }: { text: string }) {
  const announce = useAnnounce();
  return <button onClick={() => announce(text)}>falar</button>;
}

describe('componentes base', () => {
  it('announce escreve em uma única região role=status', async () => {
    vi.useFakeTimers();
    render(<LiveAnnouncerProvider><Speaker text="Preço atualizado" /></LiveAnnouncerProvider>);
    fireEvent.click(screen.getByText('falar'));
    await act(async () => { await vi.advanceTimersByTimeAsync(60); });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Preço atualizado');
    vi.useRealTimers();
  });

  it('Skeleton é decorativo e usa a classe de shimmer', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('skeleton');
  });

  it('ErrorState mostra a mensagem da API e chama onRetry', () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new ApiError({ status: 503, code: 'TRANSIENT', message: 'Instável agora.' })} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Instável agora.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('FormField associa label e erro ao campo', () => {
    render(<FormField label="E-mail" error="Informe um e-mail válido.">{(p) => <Input {...p} />}</FormField>);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)).toHaveTextContent('Informe um e-mail válido.');
  });
});
