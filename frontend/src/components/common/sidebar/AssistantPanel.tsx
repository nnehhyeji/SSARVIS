import React from 'react';
import type { Mode } from '../../../types';

interface AssistantPanelProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const assistantModes: Array<{
  label: string;
  mode: Mode;
  desc: string;
}> = [
  {
    label: '학습 모드',
    mode: 'study',
    desc: '공부, 정리, 설명이 필요한 대화를 이어가는 모드입니다.',
  },
  {
    label: '상담 모드',
    mode: 'counseling',
    desc: '마음을 정리하고 이야기를 나누는 데 집중하는 모드입니다.',
  },
];

const AssistantPanel: React.FC<AssistantPanelProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex flex-1 flex-col bg-white pt-2">
      <div className="flex flex-col gap-8 px-8 pt-6">
        {assistantModes.map((mode) => (
          <button
            key={mode.mode}
            onClick={() => onModeChange(mode.mode)}
            className="group text-left transition-all"
          >
            <h3
              className={`text-2xl font-black transition-colors ${
                currentMode === mode.mode
                  ? 'text-rose-500'
                  : 'text-gray-500 group-hover:text-gray-800'
              }`}
            >
              {mode.label}
            </h3>
            <p className="mt-2 text-sm font-bold leading-relaxed text-gray-400">{mode.desc}</p>
            {currentMode === mode.mode && (
              <div className="mt-4 h-1.5 w-16 rounded-full bg-rose-500 shadow-sm" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AssistantPanel;
