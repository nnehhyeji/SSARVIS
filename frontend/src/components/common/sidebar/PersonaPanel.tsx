import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Mode } from '../../../types';
import { PATHS } from '../../../routes/paths';

interface PersonaPanelProps {
  onModeChange: (mode: Mode) => void;
}

const PersonaPanel: React.FC<PersonaPanelProps> = ({ onModeChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isDualParam = searchParams.get('dual') === 'true';

  const items = [
    {
      id: 'with_me',
      label: 'With Me',
      mode: 'persona' as Mode,
      desc: '내 페르소나와 마주하며 대화를 나눕니다.',
      path: PATHS.NAMNA,
    },
    {
      id: 'with_mine',
      label: 'With Mine',
      mode: 'persona' as Mode,
      desc: '내 AI 비서와 내 페르소나가 서로 대화합니다.',
      path: `${PATHS.NAMNA}?dual=true`,
    },
  ];

  return (
    <div className="flex-1 flex flex-col pt-2 bg-white">
      <div className="flex flex-col gap-8 px-8 pt-6">
        {items.map((m) => {
          // With Mine 아이템인 경우 파라미터 체크, 그 외엔 기본 체크
          const isActive = m.id === 'with_mine' ? isDualParam : (!isDualParam && location.pathname === PATHS.NAMNA);

          return (
            <button
              key={m.id}
              onClick={() => {
                onModeChange(m.mode);
                navigate(m.path);
              }}
              className="text-left group transition-all"
            >
              <h3
                className={`text-2xl font-black transition-colors ${isActive ? 'text-rose-500' : 'text-gray-500 group-hover:text-gray-800'}`}
              >
                {m.label}
              </h3>
              <p className="text-sm font-bold text-gray-400 mt-2 leading-relaxed">{m.desc}</p>
              {isActive && <div className="mt-4 h-1.5 w-16 bg-rose-500 rounded-full shadow-sm" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PersonaPanel;
