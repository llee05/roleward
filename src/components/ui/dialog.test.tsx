import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Modal } from './dialog';
it('gives the dialog an accessible name and supports Escape dismissal', () => {
  const onOpenChange = vi.fn();
  render(
    <Modal
      open
      title="Add an application"
      description="Keep your details together."
      onOpenChange={onOpenChange}
    >
      <label>
        Company
        <input />
      </label>
    </Modal>,
  );
  expect(
    screen.getByRole('dialog', { name: 'Add an application' }),
  ).toBeInTheDocument();
  fireEvent.keyDown(screen.getByLabelText('Company'), { key: 'Escape' });
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
