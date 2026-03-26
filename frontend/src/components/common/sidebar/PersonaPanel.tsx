import React from 'react';
import type { Mode } from '../../../types';

interface PersonaPanelProps {
  onModeChange: (mode: Mode) => void;
  setActiveTertiary: (
    val: 'friends' | 'chat' | 'notifications' | 'search' | 'assistant' | 'persona' | null,
  ) => void;
}

const PersonaPanel: React.FC<PersonaPanelProps> = ({ onModeChange, setActiveTertiary }) => {
  return (
    <div className="flex-1 flex flex-col pt-2 bg-[#eee5df]">
      <div className="flex flex-col gap-10 px-10 pt-10">
        {[
          {
            label: 'With Me',
            mode: 'persona' as Mode,
            desc: '내 페르소나와 마주하며 대화를 나눕니다.',
          },
          {
            label: 'With Mine',
            mode: 'persona' as Mode,
            desc: '내 AI 비서와 내 페르소나가 서로 대화합니다.',
          },
        ].map((m) => (
          <button
            key={m.label}
            onClick={() => {
              onModeChange(m.mode);
              setActiveTertiary(null);
            }}
            className={`text-left group transition-all`}
          >
            <h3 className="text-3xl font-black text-gray-500 group-hover:text-gray-800 transition-colors">
              {m.label}
            </h3>
            <p className="text-sm font-bold text-gray-400 mt-2 leading-relaxed">{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PersonaPanel;
