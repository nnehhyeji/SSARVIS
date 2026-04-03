import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import ProtectedRoute from '../components/common/ProtectedRoute';
import { PATHS } from './paths';

const UserMainPage = lazy(() => import('../pages/home/UserMainPage'));
const CardPage = lazy(() => import('../pages/card/CardPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const SignupPage = lazy(() => import('../pages/auth/SignupPage'));
const KakaoCallbackPage = lazy(() => import('../pages/auth/KakaoCallbackPage'));
const TutorialPage = lazy(() => import('../pages/auth/TutorialPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const PersonaSurveyPage = lazy(() => import('../pages/persona/PersonaSurveyPage'));
const AssistantPage = lazy(() => import('../pages/assistant/AssistantPage'));
const NamnaPage = lazy(() => import('../pages/namna/NamnaPage'));
const ChatArchiveListPage = lazy(() => import('../pages/chat/ChatArchiveListPage'));
const GuestExperiencePage = lazy(() => import('../pages/guest/GuestExperiencePage'));
const GuestCompletePage = lazy(() => import('../pages/guest/GuestCompletePage'));
const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const MainLayout = lazy(() => import('../components/layout/MainLayout'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div className="rounded-full border border-gray-200 bg-gray-50 px-5 py-2 text-sm font-bold text-gray-500">
        페이지 불러오는 중...
      </div>
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function withProtectedSuspense(element: ReactNode) {
  return withSuspense(<ProtectedRoute>{element}</ProtectedRoute>);
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(<LandingPage />),
  },
  {
    path: PATHS.GUEST_EXPERIENCE,
    element: withSuspense(<GuestExperiencePage />),
  },
  {
    path: PATHS.GUEST_COMPLETE_PARAM,
    element: withSuspense(<GuestCompletePage />),
  },
  {
    element: withSuspense(<MainLayout />),
    children: [
      {
        path: PATHS.VISIT_PARAM,
        element: withSuspense(<UserMainPage />),
      },
      {
        path: PATHS.USER_HOME_PARAM,
        element: withSuspense(<UserMainPage />),
      },
      {
        path: PATHS.ASSISTANT,
        element: withProtectedSuspense(<AssistantPage />),
      },
      {
        path: PATHS.NAMNA,
        element: withProtectedSuspense(<NamnaPage />),
      },
      {
        path: PATHS.CHAT,
        element: withProtectedSuspense(<ChatArchiveListPage />),
      },
      {
        path: PATHS.CHAT_ARCHIVE_PARAM,
        element: withProtectedSuspense(<ChatArchiveListPage />),
      },
      {
        path: PATHS.PROFILE,
        element: withProtectedSuspense(<ProfilePage />),
      },
      {
        path: PATHS.SETTINGS_PARAM,
        element: withProtectedSuspense(<SettingsPage />),
      },
      {
        path: PATHS.CARD_PARAM,
        element: withProtectedSuspense(<CardPage />),
      },
      {
        path: PATHS.PERSONA_PARAM,
        element: withSuspense(<PersonaSurveyPage />),
      },
    ],
  },
  {
    path: PATHS.LOGIN,
    element: withSuspense(<LoginPage />),
  },
  {
    path: PATHS.SIGNUP,
    element: withSuspense(<SignupPage />),
  },
  {
    path: PATHS.KAKAO_CALLBACK,
    element: withSuspense(<KakaoCallbackPage />),
  },
  {
    path: PATHS.TUTORIAL,
    element: withProtectedSuspense(<TutorialPage />),
  },
]);
