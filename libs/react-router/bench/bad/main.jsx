import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Root from './routes/Root';
import Dashboard, { dashboardLoader } from './routes/Dashboard';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Root />,
      children: [{ path: 'dashboard', element: <Dashboard />, loader: dashboardLoader }],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
    },
  }
);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} fallbackElement={<p>Loading...</p>} future={{ v7_startTransition: true }} />
);
