import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { loginHref } from '@/lib/authReturn';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute(): React.JSX.Element {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);
  if (!accessToken) {
    return <Navigate to={loginHref(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }
  return <Outlet />;
}
