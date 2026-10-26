import { act } from 'react-dom/test-utils';
import TestRenderer from 'react-test-renderer';
import { createRoot } from 'react-dom/client';
import { Counter } from './Counter';

test('renders snapshot', () => {
  const tree = TestRenderer.create(<Counter />).toJSON();
  expect(tree).toMatchSnapshot();
});

test('increments on click', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(<Counter />);
  });
  const button = container.querySelector('button');
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect(container.textContent).toContain('Count: 1');
});
