import { useEffect, useState } from 'react';

export function useHasUserGesture() {
  const [hasUserGesture, setHasUserGesture] = useState(false);

  useEffect(() => {
    if (hasUserGesture) return;

    const markUserGesture = () => {
      setHasUserGesture(true);
    };

    window.addEventListener('pointerdown', markUserGesture, { passive: true });
    window.addEventListener('keydown', markUserGesture);
    window.addEventListener('touchstart', markUserGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', markUserGesture);
      window.removeEventListener('keydown', markUserGesture);
      window.removeEventListener('touchstart', markUserGesture);
    };
  }, [hasUserGesture]);

  return hasUserGesture;
}
