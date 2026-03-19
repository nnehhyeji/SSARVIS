import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { PATHS } from '../../routes/paths';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn } = useUserStore();

  if (!isLoggedIn) {
    // 로그인 안 되어 있으면 로그인 페이지로 강제 이동
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  // 로그인 되어 있으면 자식 컴포넌트(원래 가려던 페이지) 렌더링
  return <>{children}</>;
}
