import React from 'react';

const F1LoadingLights: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <div className="flex items-center space-x-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-2xl">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col space-y-2">
            {/* The light housing */}
            <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center overflow-hidden relative">
              {/* The red light */}
              <div 
                className={`w-10 h-10 rounded-full transition-all duration-300 shadow-inner
                  animate-[f1-light-up_3s_infinite]
                `}
                style={{ 
                  animationDelay: `${i * 0.4}s`,
                  backgroundColor: '#3f0000', // Dark/off state
                }}
              />
              {/* Glass effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
            </div>
            {/* Indicator light below (optional, adds detail) */}
            <div className="w-1.5 h-1.5 rounded-full mx-auto bg-zinc-800" />
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes f1-light-up {
          0%, 10% { background-color: #3f0000; box-shadow: none; }
          15%, 70% { background-color: #ef4444; box-shadow: 0 0 20px #ef4444, 0 0 40px #ef4444; }
          75%, 100% { background-color: #3f0000; box-shadow: none; }
        }
      `}} />
    </div>
  );
};

export default F1LoadingLights;
