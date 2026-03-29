declare module 'react-kakao-login' {
  import type { ComponentType, ReactNode } from 'react';

  interface KakaoLoginProps {
    token?: string;
    onSuccess?: (response: unknown) => void;
    onFail?: (error: unknown) => void;
    onLogout?: () => void;
    render?: (props: { onClick: () => void }) => ReactNode;
  }

  const KakaoLogin: ComponentType<KakaoLoginProps>;
  export default KakaoLogin;
}
