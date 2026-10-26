import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import App from './App.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'), {
  onCaughtError: (error, errorInfo) => {
    console.warn('Caught by boundary', error, errorInfo.componentStack);
  },
});

export function Toast({ message }) {
  return createPortal(<div className="toast">{message}</div>, document.body);
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
