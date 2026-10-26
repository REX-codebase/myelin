import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet, useNavigate, useLocation } from 'react-router';
import Home from './pages/Home';
import About from './pages/About';
import UserProfile from './pages/UserProfile';
import NotFound from './pages/NotFound';
import { useAuth } from './auth';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <nav className="main-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>Home</NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>About</NavLink>
        <span className="path">{location.pathname}</span>
        <button onClick={() => navigate(-1)}>Back</button>
      </nav>
      <Outlet />
    </>
  );
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="users/:id" element={<RequireAuth><UserProfile /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
