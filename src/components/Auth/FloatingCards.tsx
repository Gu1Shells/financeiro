import { TrendingUp, DollarSign, CreditCard, PieChart, BarChart3, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CardData {
  icon: typeof TrendingUp;
  value: string;
  label: string;
  trend?: 'up' | 'down';
  color: string;
  delay: number;
  duration: number;
}

const cards: CardData[] = [
  {
    icon: TrendingUp,
    value: 'R$ 12.450',
    label: 'Receita Mensal',
    trend: 'up',
    color: 'from-emerald-500 to-teal-600',
    delay: 0,
    duration: 20,
  },
  {
    icon: DollarSign,
    value: 'R$ 8.320',
    label: 'Despesas Pagas',
    color: 'from-blue-500 to-cyan-600',
    delay: 2,
    duration: 25,
  },
  {
    icon: CreditCard,
    value: 'R$ 2.150',
    label: 'Pendente',
    trend: 'down',
    color: 'from-amber-500 to-orange-600',
    delay: 4,
    duration: 22,
  },
  {
    icon: PieChart,
    value: '87%',
    label: 'Taxa de Pagamento',
    trend: 'up',
    color: 'from-violet-500 to-purple-600',
    delay: 1,
    duration: 23,
  },
  {
    icon: BarChart3,
    value: 'R$ 45.230',
    label: 'Total Anual',
    trend: 'up',
    color: 'from-rose-500 to-pink-600',
    delay: 3,
    duration: 21,
  },
  {
    icon: Wallet,
    value: 'R$ 3.890',
    label: 'Saldo',
    color: 'from-teal-500 to-emerald-600',
    delay: 5,
    duration: 24,
  },
];

export const FloatingCards = () => {
  return (
    <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none z-0">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const positions = [
          { top: '10%', left: '5%' },
          { top: '20%', right: '8%' },
          { bottom: '15%', left: '10%' },
          { top: '50%', left: '2%' },
          { bottom: '25%', right: '5%' },
          { top: '70%', right: '12%' },
        ];

        return (
          <div
            key={index}
            className="absolute animate-float-slow"
            style={{
              ...positions[index],
              animationDelay: `${card.delay}s`,
              animationDuration: `${card.duration}s`,
            }}
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 min-w-[200px] border border-gray-100 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className={`bg-gradient-to-br ${card.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {card.trend && (
                  <div className={`${card.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {card.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-800 mb-1">{card.value}</p>
              <p className="text-sm text-gray-600">{card.label}</p>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(2deg);
          }
          50% {
            transform: translateY(-10px) translateX(-10px) rotate(-1deg);
          }
          75% {
            transform: translateY(-25px) translateX(5px) rotate(1deg);
          }
        }

        .animate-float-slow {
          animation: float-slow ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
