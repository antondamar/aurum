import React from 'react';

const LiquidBackground = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#010203] overflow-hidden pointer-events-none">
    <div className="absolute inset-0">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 200 + 100}px`,
            height: `${Math.random() * 200 + 100}px`,
            background: `radial-gradient(circle, rgba(211, 172, 44, ${Math.random() * 0.4 + 0.3}) 0%, rgba(211, 172, 44, 0.1) 50%, transparent 70%)`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            filter: 'blur(30px)',
            animation: `bokeh ${Math.random() * 20 + 15}s ease-in-out infinite`,
            animationDelay: `-${Math.random() * 10}s`
          }}
        />
      ))}
    </div>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes bokeh {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
        25% { transform: translate(50px, -30px) scale(1.3); opacity: 0.9; }
        50% { transform: translate(-30px, 50px) scale(0.9); opacity: 0.7; }
        75% { transform: translate(40px, 40px) scale(1.2); opacity: 0.8; }
        100% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
      }
    `}} />
  </div>
  );
};

export default LiquidBackground;