import React, { useMemo } from 'react';

const LiquidBackground = () => {
  // Generate blob configurations ONCE and memoize them
  const blobs = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      width: Math.random() * 200 + 100,
      height: Math.random() * 200 + 100,
      opacity: Math.random() * 0.4 + 0.3,
      top: Math.random() * 100,
      left: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: -(Math.random() * 10)
    }));
  }, []); // Empty dependency array = only runs once

  return (
    <div className="fixed inset-0 z-0 bg-[#010203] overflow-hidden pointer-events-none">
      <div className="absolute inset-0">
        {blobs.map((blob) => (
          <div
            key={blob.id}
            className="absolute rounded-full"
            style={{
              width: `${blob.width}px`,
              height: `${blob.height}px`,
              background: `radial-gradient(circle, rgba(211, 172, 44, ${blob.opacity}) 0%, rgba(211, 172, 44, 0.1) 50%, transparent 70%)`,
              top: `${blob.top}%`,
              left: `${blob.left}%`,
              filter: 'blur(30px)',
              animation: `bokeh ${blob.duration}s ease-in-out infinite`,
              animationDelay: `${blob.delay}s`
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