import React from 'react';

const LiquidBackground = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#010203] overflow-hidden pointer-events-none">
      {/* 1. Subtle Radial Glow (The "Aura") */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#D3AC2C]/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#D3AC2C]/5 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />

      {/* 2. Luxury Mesh Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#D3AC2C 1px, transparent 1px), linear-gradient(90deg, #D3AC2C 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* 3. Floating "Gold Dust" Particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-[#D3AC2C] to-[#A57A03] opacity-20 blur-[1px]"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `-${Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* 4. Deep Vignette */}
      <div className="absolute inset-0 bg-radial-vignette shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />

      {/* Custom Keyframe Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-100vh) translateX(20px) rotate(360deg); opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default LiquidBackground;