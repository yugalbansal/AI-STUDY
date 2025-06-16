import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isListening, 
  isSpeaking, 
  isConnected 
}) => {
  const [bars, setBars] = useState<number[]>(new Array(20).fill(0));

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isListening || isSpeaking) {
      interval = setInterval(() => {
        setBars(prev => prev.map(() => Math.random() * 100));
      }, 100);
    } else {
      setBars(new Array(20).fill(0));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening, isSpeaking]);

  const getBarColor = () => {
    if (isSpeaking) return 'bg-blue-500';
    if (isListening) return 'bg-green-500';
    return 'bg-slate-600';
  };

  return (
    <div className="flex items-end justify-center gap-1 h-32 w-80">
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-3 rounded-t-lg transition-all duration-100 ${getBarColor()}`}
          style={{
            height: `${Math.max(height, 10)}%`,
            opacity: isConnected ? 1 : 0.3
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
