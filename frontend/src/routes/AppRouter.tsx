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

import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import { PATHS } from './paths';

/**
 * React Router v6.4+의 createBrowserRouter를 사용한 라우터 객체입니다.
 */
export const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <UserMainPage />,
      },
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
        element: (
          <ProtectedRoute>
            <PersonaSurveyPage />
          </ProtectedRoute>
        ),
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
