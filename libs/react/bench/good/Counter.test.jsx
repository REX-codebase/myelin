import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from './Counter';

test('increments on click', async () => {
  render(<Counter />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /increment/i }));
  });
  expect(screen.getByText('Count: 1')).toBeTruthy();
});
