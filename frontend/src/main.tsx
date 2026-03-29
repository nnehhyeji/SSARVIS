import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './App.css';
import { router } from './routes/AppRouter';
import ToastViewport from './components/common/ToastViewport';
import AudioUnlockOverlay from './components/common/AudioUnlockOverlay';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <RouterProvider router={router} />
      <ToastViewport />
      <AudioUnlockOverlay />
    </>
  </StrictMode>,
);
