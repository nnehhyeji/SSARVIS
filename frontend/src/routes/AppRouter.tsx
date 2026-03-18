import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/home/HomePage';
import VisitPage from '../pages/visit/VisitPage';
import CardPage from '../pages/card/CardPage';
import LoginPage from '../pages/auth/LoginPage';
import { PATHS } from './paths';

/**
 * React Router v6.4+의 createBrowserRouter를 사용한 라우터 객체입니다.
 * 이 방식은 Data API(loader, action)를 지원하며 성능상 이점이 있습니다.
 */
export const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <HomePage />,
  },
  {
    path: PATHS.VISIT_PARAM,
    element: <VisitPage />,
  },
  {
    path: PATHS.CARD_PARAM,
    element: <CardPage />,
  },
  {
    path: PATHS.LOGIN,
    element: <LoginPage />,
  },
]);
