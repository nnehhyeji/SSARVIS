import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './App.css';
import { router } from './routes/AppRouter';

const ToastViewport = lazy(() => import('./components/common/ToastViewport'));
const AudioUnlockOverlay = lazy(() => import('./components/common/AudioUnlockOverlay'));
import HotjarUserSync from './components/common/HotjarUserSync';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <RouterProvider router={router} />
      <HotjarUserSync />
      <Suspense fallback={null}>
        <ToastViewport />
        <AudioUnlockOverlay />
      </Suspense>
    </>
  </StrictMode>,
);
