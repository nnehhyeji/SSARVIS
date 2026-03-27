import React from 'react';
import type { Mode } from '../../../types';

interface AssistantPanelProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex-1 flex flex-col pt-2 bg-white">
      <div className="flex flex-col gap-8 px-8 pt-6">
        {[
          {
            label: '일상 모드',
            mode: 'normal' as Mode,
            desc: '일상적인 대화와 교감을 나눕니다.',
          },
          {
            label: '학습 모드',
            mode: 'study' as Mode,
            desc: '지식 습득과 질문 답변에 최적화됩니다.',
          },
          {
            label: '상담 모드',
            mode: 'counseling' as Mode,
            desc: '고민 상담과 감정적인 지지를 제공합니다.',
          },
        ].map((m) => (
          <button
            key={m.mode}
            onClick={() => {
              onModeChange(m.mode);
            }}
            className={`text-left group transition-all`}
          >
            <h3
              className={`text-2xl font-black transition-colors ${currentMode === m.mode ? 'text-rose-500' : 'text-gray-500 group-hover:text-gray-800'}`}
            >
              {m.label}
            </h3>
            <p className="text-sm font-bold text-gray-400 mt-2 leading-relaxed">{m.desc}</p>
            {currentMode === m.mode && (
              <div className="mt-4 h-1.5 w-16 bg-rose-500 rounded-full shadow-sm" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AssistantPanel;
