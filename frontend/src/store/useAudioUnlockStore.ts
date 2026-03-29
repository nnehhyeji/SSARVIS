import { create } from 'zustand';

interface AudioUnlockState {
  isOpen: boolean;
  title: string;
  description: string;
  actionLabel: string;
  retryAction: (() => Promise<void>) | null;
  requestUnlock: (options?: {
    title?: string;
    description?: string;
    actionLabel?: string;
    retryAction?: (() => Promise<void>) | null;
  }) => void;
  dismissUnlock: () => void;
  runUnlockAction: () => Promise<void>;
}

const DEFAULT_TITLE = 'AI 음성을 재생하려면 한 번 눌러주세요';
const DEFAULT_DESCRIPTION =
  '브라우저 정책 때문에 첫 음성 응답은 클릭이나 탭 이후에 재생할 수 있어요.';
const DEFAULT_ACTION_LABEL = '소리 켜기';

export const useAudioUnlockStore = create<AudioUnlockState>()((set, get) => ({
  isOpen: false,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  actionLabel: DEFAULT_ACTION_LABEL,
  retryAction: null,

  requestUnlock: (options) =>
    set({
      isOpen: true,
      title: options?.title ?? DEFAULT_TITLE,
      description: options?.description ?? DEFAULT_DESCRIPTION,
      actionLabel: options?.actionLabel ?? DEFAULT_ACTION_LABEL,
      retryAction: options?.retryAction ?? null,
    }),

  dismissUnlock: () =>
    set({
      isOpen: false,
      retryAction: null,
    }),

  runUnlockAction: async () => {
    const action = get().retryAction;
    set({
      isOpen: false,
      retryAction: null,
    });

    if (action) {
      await action();
    }
  },
}));
