import { createBrowserRouter } from 'react-router-dom';
import UserMainPage from '../pages/home/UserMainPage';
import CardPage from '../pages/card/CardPage';
import LoginPage from '../pages/auth/LoginPage';
import SettingsPage from '../pages/settings/SettingsPage';
import SignupPage from '../pages/auth/SignupPage';
import TutorialPage from '../pages/auth/TutorialPage';
import ProfilePage from '../pages/profile/ProfilePage';
import PersonaSurveyPage from '../pages/persona/PersonaSurveyPage';
// New Pages
import AssistantPage from '../pages/assistant/AssistantPage';
import NamnaPage from '../pages/namna/NamnaPage';
import ChatArchiveListPage from '../pages/chat/ChatArchiveListPage';
import GuestExperiencePage from '../pages/guest/GuestExperiencePage';
import GuestCompletePage from '../pages/guest/GuestCompletePage';

import LandingPage from '../pages/landing/LandingPage';

import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import { PATHS } from './paths';

/**
 * 애플리케이션 라우터 설정
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />, // 루트 도메인 접속 시 체험/로그인 선택 랜딩 페이지
  },
  {
    path: PATHS.GUEST_EXPERIENCE,
    element: <GuestExperiencePage />,
  },
  {
    path: PATHS.GUEST_COMPLETE_PARAM,
    element: <GuestCompletePage />,
  },
  {
    element: <MainLayout />, // 사이드바가 필요한 내부 홈/기능 페이지들
    children: [
      {
        path: PATHS.USER_HOME_PARAM,
        element: <UserMainPage />,
      },
      {
        path: PATHS.ASSISTANT,
        element: (
          <ProtectedRoute>
            <AssistantPage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.NAMNA,
        element: (
          <ProtectedRoute>
            <NamnaPage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.CHAT,
        element: (
          <ProtectedRoute>
            <ChatArchiveListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.CHAT_ARCHIVE_PARAM,
        element: (
          <ProtectedRoute>
            <ChatArchiveListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.PROFILE,
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.SETTINGS_PARAM,
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.CARD_PARAM,
        element: (
          <ProtectedRoute>
            <CardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: PATHS.PERSONA_PARAM,
        element: <PersonaSurveyPage />,
      },
    ],
  },
  {
    path: PATHS.LOGIN,
    element: <LoginPage />,
  },
  {
    path: PATHS.SIGNUP,
    element: <SignupPage />,
  },
  {
    path: PATHS.TUTORIAL,
    element: (
      <ProtectedRoute>
        <TutorialPage />
      </ProtectedRoute>
    ),
  },
]);
