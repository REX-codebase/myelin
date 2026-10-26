import { Redirect, useRouteMatch } from 'react-router';
import { useAuth } from './auth';

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const match = useRouteMatch('/admin');

  if (!user) {
    return <Redirect to="/login" />;
  }
  if (match && !user.isAdmin) {
    return <Redirect to="/" />;
  }
  return children;
}
