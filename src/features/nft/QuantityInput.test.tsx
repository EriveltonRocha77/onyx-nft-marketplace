import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { QuantityInput, quantityLimit } from './QuantityInput';

function Harness({ max }: { max: number }) {
  const [v, setV] = useState(1);
  return <QuantityInput value={v} max={max} onChange={setV} />;
}

describe('quantityLimit', () => {
  it('usa o menor entre estoque e 10', () => {
    expect(quantityLimit(3)).toBe(3);
    expect(quantityLimit(50)).toBe(10);
    expect(quantityLimit(0)).toBe(0);
  });
});

describe('QuantityInput', () => {
  it('respeita o limite máximo', async () => {
    render(<Harness max={2} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }));
    expect(screen.getByLabelText('Quantidade')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();
  });
  it('não passa de 1 para baixo', () => {
    render(<Harness max={5} />);
    expect(screen.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled();
  });
  it('desabilita sem estoque', () => {
    render(<Harness max={0} />);
    expect(screen.getByLabelText('Quantidade')).toBeDisabled();
  });
});
