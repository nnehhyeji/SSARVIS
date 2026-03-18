import type { Mode } from '../types';

// ─── 모드별 배경 색상 팔레트 ───
// AnimatedBackground 컴포넌트에 props로 전달되는 색상 설정값입니다.
export type BgColors = {
  baseTop?: string;
  baseBottom?: string;
  purple?: string;
  teal?: string;
  pink?: string;
  mint?: string;
  plume?: string;
  streak?: string;
};

export const BG_COLORS: Record<Mode, BgColors> = {
  normal: {},
  study: {
    baseTop: '#EDE5D4',
    baseBottom: '#7BA0B4',
    purple: '#D4B890',
    teal: '#C8804A',
    pink: '#E0C898',
    mint: '#8FBACF',
    plume: '#FAF4E8',
    streak: '#E8DDC8',
  },
  counseling: {
    baseTop: '#C8DCC8',
    baseBottom: '#8CBCC0',
    purple: '#E0B0C0',
    teal: '#90C8D8',
    pink: '#F0C08C',
    mint: '#C8DC88',
    plume: '#F4FAF0',
    streak: '#E8D4E8',
  },
};

// ─── 시크릿(잠금) 모드 배경 팔레트 ───
export const LOCK_MODE_PALETTE: BgColors = {
  baseTop: '#1A1A1A',
  baseBottom: '#000000',
  purple: '#2D2D2D',
  teal: '#121212',
  pink: '#333333',
  mint: '#0A0A0A',
  plume: '#444444',
  streak: '#222222',
};

// ─── 팔로우 방문 시 랜덤 배경 팔레트 목록 ───
export const VISITOR_PALETTES: BgColors[] = [
  {
    baseTop: '#D4E5FF',
    baseBottom: '#A8C8FF',
    purple: '#C1C9F5',
    teal: '#98FB98',
    pink: '#FFD1DC',
    mint: '#E0FFFF',
  },
  {
    baseTop: '#FFF5E1',
    baseBottom: '#FFDAB9',
    purple: '#E6E6FA',
    teal: '#B0E0E6',
    pink: '#FFB6C1',
    mint: '#F0FFF0',
  },
  {
    baseTop: '#E6E6FA',
    baseBottom: '#D8BFD8',
    purple: '#DDA0DD',
    teal: '#AFEEEE',
    pink: '#FFF0F5',
    mint: '#F5FFFA',
  },
  {
    baseTop: '#F0FFF0',
    baseBottom: '#98FB98',
    purple: '#E0FFFF',
    teal: '#FFD700',
    pink: '#FFE4E1',
    mint: '#F0F8FF',
  },
];
