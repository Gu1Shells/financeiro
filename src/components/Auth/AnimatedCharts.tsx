export const AnimatedCharts = () => {
  return (
    <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute bottom-10 left-16 animate-chart-rise" style={{ animationDelay: '0s' }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-64">
          <p className="text-xs text-gray-600 mb-3 font-semibold">CRESCIMENTO MENSAL</p>
          <div className="flex items-end gap-2 h-32">
            <div className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg animate-bar-grow" style={{ height: '45%', animationDelay: '0.5s' }}></div>
            <div className="flex-1 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-lg animate-bar-grow" style={{ height: '65%', animationDelay: '0.7s' }}></div>
            <div className="flex-1 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-lg animate-bar-grow" style={{ height: '80%', animationDelay: '0.9s' }}></div>
            <div className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg animate-bar-grow" style={{ height: '95%', animationDelay: '1.1s' }}></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
          </div>
        </div>
      </div>

      <div className="absolute top-20 right-20 animate-chart-rise" style={{ animationDelay: '1s' }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-56">
          <p className="text-xs text-gray-600 mb-3 font-semibold">PARTICIPAÇÃO</p>
          <div className="relative w-32 h-32 mx-auto">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#gradient1)"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray="351.68"
                strokeDashoffset="87.92"
                className="animate-circle-draw"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">75%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-32 right-32 animate-chart-rise" style={{ animationDelay: '0.5s' }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-72">
          <p className="text-xs text-gray-600 mb-3 font-semibold">TENDÊNCIA ANUAL</p>
          <div className="relative h-24">
            <svg className="w-full h-full" viewBox="0 0 280 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <path
                d="M 0,60 L 40,50 L 80,45 L 120,35 L 160,30 L 200,20 L 240,15 L 280,10"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                fill="none"
                className="animate-line-draw"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="0" cy="60" r="4" fill="#f59e0b" className="animate-dot-pulse" style={{ animationDelay: '0s' }} />
              <circle cx="40" cy="50" r="4" fill="#f59e0b" className="animate-dot-pulse" style={{ animationDelay: '0.2s' }} />
              <circle cx="80" cy="45" r="4" fill="#fb923c" className="animate-dot-pulse" style={{ animationDelay: '0.4s' }} />
              <circle cx="120" cy="35" r="4" fill="#fb923c" className="animate-dot-pulse" style={{ animationDelay: '0.6s' }} />
              <circle cx="160" cy="30" r="4" fill="#f87171" className="animate-dot-pulse" style={{ animationDelay: '0.8s' }} />
              <circle cx="200" cy="20" r="4" fill="#f87171" className="animate-dot-pulse" style={{ animationDelay: '1s' }} />
              <circle cx="240" cy="15" r="4" fill="#ef4444" className="animate-dot-pulse" style={{ animationDelay: '1.2s' }} />
              <circle cx="280" cy="10" r="4" fill="#ef4444" className="animate-dot-pulse" style={{ animationDelay: '1.4s' }} />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute top-1/3 left-32 animate-chart-rise" style={{ animationDelay: '1.5s' }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 w-48">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600 font-semibold">ECONOMIA</span>
            <span className="text-emerald-600 text-xs font-bold">+23%</span>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            R$ 8.4K
          </p>
          <div className="mt-3 flex gap-1">
            {[30, 45, 25, 55, 40, 65, 50, 75, 60, 80].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full animate-mini-bar"
                style={{
                  height: `${height}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chart-rise {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bar-grow {
          0% {
            transform: scaleY(0);
          }
          100% {
            transform: scaleY(1);
          }
        }

        @keyframes circle-draw {
          0% {
            strokeDashoffset: 351.68;
          }
          100% {
            strokeDashoffset: 87.92;
          }
        }

        @keyframes line-draw {
          0% {
            strokeDasharray: 0 1000;
          }
          100% {
            strokeDasharray: 1000 0;
          }
        }

        @keyframes dot-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.8;
          }
        }

        @keyframes mini-bar {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-chart-rise {
          animation: chart-rise 1s ease-out forwards;
        }

        .animate-bar-grow {
          transform-origin: bottom;
          animation: bar-grow 1.5s ease-out forwards;
        }

        .animate-circle-draw {
          animation: circle-draw 2s ease-out forwards;
        }

        .animate-line-draw {
          animation: line-draw 2s ease-out forwards;
        }

        .animate-dot-pulse {
          animation: dot-pulse 2s ease-in-out infinite;
        }

        .animate-mini-bar {
          animation: mini-bar 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
