import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

import Header from '../components/common/Header';
import type { Alarm } from '../types';

const sampleAlarms: Alarm[] = [
  {
    id: 1,
    message: '새 알림이 도착했습니다.',
    isRead: false,
    time: '방금 전',
    type: 'NOTICE',
  },
  {
    id: 2,
    message: '프로필을 확인한 사용자가 있습니다.',
    isRead: true,
    time: '5분 전',
    type: 'VIEW',
  },
];

const meta = {
  title: 'Common/Header',
  component: Header,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/home']}>
        <div
          style={{
            minHeight: '100vh',
            padding: '24px',
            background:
              'linear-gradient(135deg, rgb(27, 45, 78) 0%, rgb(67, 104, 173) 55%, rgb(155, 190, 255) 100%)',
          }}
        >
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    alarms: sampleAlarms,
    isAlarmModalOpen: false,
    onToggleAlarm: () => undefined,
    onReadAllAlarms: () => undefined,
    onDeleteAllAlarms: () => undefined,
    onAlarmClick: () => undefined,
    onMyCardClick: () => undefined,
    isVisitorMode: false,
    onLeaveVisitor: () => undefined,
    viewCount: 1284,
    onUsersClick: () => undefined,
    onSharePersonaClick: () => undefined,
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AlarmModalOpen: Story = {
  args: {
    isAlarmModalOpen: true,
  },
};

export const VisitorMode: Story = {
  args: {
    isVisitorMode: true,
    onSharePersonaClick: undefined,
  },
};
