import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGate } from '@/components/auth/RoleGate';
import { HomePage } from '@/pages/marketing/HomePage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { UserAccountPage } from '@/pages/auth/UserAccountPage';
import { ContentStudioPage } from '@/pages/app/ContentStudioPage';
import { canAccessStudioWorkspace } from '@/config/roles';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AdminContentRedirect(): React.JSX.Element {
  const location = useLocation();
  return <Navigate to={`/app${location.search}`} replace />;
}

function AuthenticatedHomeRedirect(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  if (user && canAccessStudioWorkspace(user.role)) {
    return <Navigate to="/app" replace />;
  }
  return <Navigate to="/account" replace />;
}

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<UserAccountPage />} />
            <Route path="/home" element={<AuthenticatedHomeRedirect />} />
            <Route element={<RoleGate />}>
              <Route path="/app" element={<ContentStudioPage />} />
              <Route path="/admin/content" element={<AdminContentRedirect />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#171717',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
