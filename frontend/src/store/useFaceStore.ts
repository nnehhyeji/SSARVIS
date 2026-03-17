import { create } from 'zustand';

interface FaceState {
  eyeType: 'default' | 'sleepy' | 'wow' | 'star' | 'wink' | 'love';
  mouthType: 'normal' | 'smile' | 'o';
  eyebrowType: 'none' | 'normal' | 'angry' | 'sad';
  setEyeType: (type: FaceState['eyeType']) => void;
  setMouthType: (type: FaceState['mouthType']) => void;
  setEyebrowType: (type: FaceState['eyebrowType']) => void;
}

export const useFaceStore = create<FaceState>((set) => ({
  eyeType: 'default',
  mouthType: 'o',
  eyebrowType: 'none',
  setEyeType: (type) => set({ eyeType: type }),
  setMouthType: (type) => set({ mouthType: type }),
  setEyebrowType: (type) => set({ eyebrowType: type }),
}));
