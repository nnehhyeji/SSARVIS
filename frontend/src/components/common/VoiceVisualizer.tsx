import React from 'react';
import { motion } from 'framer-motion';

interface VoiceVisualizerProps {
  isActive: boolean;
  volume: number;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive, volume }) => {
  return (
    <div className="flex items-center gap-1.5 h-12">
      {[...Array(20)].map((_, i) => {
        const factor = 1 + Math.sin(i * 0.5) * 0.5;
        return (
          <motion.div
            key={i}
            animate={{
              height: isActive ? Math.max(4, volume * 1.5 * factor) : 4,
              opacity: isActive ? Math.max(0.2, volume / 50) : 0.1,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="w-1 bg-indigo-500 rounded-full"
          />
        );
      })}
    </div>
  );
};

export default VoiceVisualizer;
