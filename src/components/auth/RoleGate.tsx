import { Navigate, Outlet } from 'react-router-dom';
import { canAccessStudioWorkspace } from '@/config/roles';
import { useAuthStore } from '@/store/authStore';

export function RoleGate(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessStudioWorkspace(user.role)) {
    return <Navigate to="/account" replace />;
  }
  return <Outlet />;
}
