import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom';
import { App } from './App';

declare global {
  interface Window {
    __INITIAL_DATA__: unknown;
  }
}

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App initialData={window.__INITIAL_DATA__} />
  </StrictMode>
);
