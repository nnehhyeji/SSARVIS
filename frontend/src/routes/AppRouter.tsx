import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/home/HomePage';
import VisitPage from '../pages/visit/VisitPage';
import CardPage from '../pages/card/CardPage';
import LoginPage from '../pages/auth/LoginPage';
import SettingsPage from '../pages/settings/SettingsPage';
import SignupPage from '../pages/auth/SignupPage';
import TutorialPage from '../pages/auth/TutorialPage';
import PersonaSurveyPage from '../pages/persona/PersonaSurveyPage';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { PATHS } from './paths';

/**
 * React Router v6.4+의 createBrowserRouter를 사용한 라우터 객체입니다.
 * 이 방식은 Data API(loader, action)를 지원하며 성능상 이점이 있습니다.
 */
export const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: PATHS.VISIT_PARAM,
    element: <VisitPage />,
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
    path: PATHS.SETTINGS_PARAM,
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
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
  {
    path: PATHS.PERSONA_PARAM,
    element: <PersonaSurveyPage />,
  },
]);
