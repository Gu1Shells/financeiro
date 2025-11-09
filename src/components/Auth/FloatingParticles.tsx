export const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 60 + 20,
    left: Math.random() * 100,
    animationDuration: Math.random() * 20 + 15,
    animationDelay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 blur-xl animate-float-up"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            bottom: '-100px',
            animationDuration: `${particle.animationDuration}s`,
            animationDelay: `${particle.animationDelay}s`,
            opacity: particle.opacity,
          }}
        />
      ))}

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: var(--tw-opacity);
          }
          90% {
            opacity: var(--tw-opacity);
          }
          100% {
            transform: translateY(-110vh) translateX(${Math.random() * 200 - 100}px) scale(1.5);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: float-up linear infinite;
        }
      `}</style>
    </div>
  );
};
