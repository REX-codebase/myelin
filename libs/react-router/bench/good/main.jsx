import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import Root from './routes/Root';
import Dashboard, { dashboardLoader } from './routes/Dashboard';
import Settings from './Settings';

function Spinner() {
  return <p>Loading...</p>;
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    HydrateFallback: Spinner,
    children: [
      { path: 'dashboard', Component: Dashboard, loader: dashboardLoader },
      { path: 'settings', Component: Settings },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} onError={(error) => console.error(error)} />
  </StrictMode>
);
