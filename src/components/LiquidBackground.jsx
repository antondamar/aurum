import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function LiquidBackground() {
  const { scrollYProgress } = useScroll();

  // Existing transforms
  const xSlow = useTransform(scrollYProgress, [0, 1], ['-50vw', '-10vw']);
  const xMid = useTransform(scrollYProgress, [0, 1], ['-60vw', '-15vw']);
  const xFast = useTransform(scrollYProgress, [0, 1], ['-70vw', '-5vw']);
  const xReverse = useTransform(scrollYProgress, [0, 1], ['40vw', '-40vw']);
  const ySlow = useTransform(scrollYProgress, [0, 1], ['0vh', '25vh']);
  const yReverse = useTransform(scrollYProgress, [0, 1], ['20vh', '-10vh']);
  const xCorner = useTransform(scrollYProgress, [0, 1], ['10vw', '-10vw']);
  const yCorner = useTransform(scrollYProgress, [0, 1], ['-20vh', '10vh']);

  // NEW: Bottom left corner light that appears at 25% scroll
  // Starts at bottom left (-50vw, 100vh) when scroll is at 25% 
  // Ends at center (0vw, 0vh) when scroll is at 100%
  const xBottomLight = useTransform(
    scrollYProgress,
    [0.25, 1], // Only active from 25% to 100% scroll
    ['-50vw', '0vw'] // Moves from left to center
  );
  
  const yBottomLight = useTransform(
    scrollYProgress,
    [0.25, 1],
    ['100vh', '0vh'] // Moves from bottom to center
  );
  
  // NEW: Opacity control - fades in at 25%, fully visible by 30%
  const opacityBottomLight = useTransform(
    scrollYProgress,
    [0.25, 0.35, 1],
    [0, 0.6, 0.4]
  );

  return (
    <div className="fixed inset-0 -z-50 bg-[#020202] overflow-hidden pointer-events-none">
      {/* Background reverse light */}
      <motion.div
        style={{
          background: 'radial-gradient(circle, #1e293b 0%, transparent 75%)',
          x: xReverse,
          y: yReverse
        }}
        className="absolute top-[30%] right-[-20%] w-[140%] h-[140%] rounded-full opacity-15 blur-[180px]"
      />
      
      {/* Bottom left corner light */}
      <motion.div
        style={{
          background:
            'radial-gradient(circle, #e5e7eb, transparent 70%)',
          x: xBottomLight,
          y: yBottomLight,
          opacity: opacityBottomLight,
        }}
        className="absolute left-0 top-0 w-[80%] h-[80%] rounded-full blur-[90px]"
      />

      
      {/* Layer 1 – deep slate */}
      <motion.div
        style={{
          background: 'radial-gradient(circle, #334155 0%, transparent 80%)',
          x: xSlow,
          y: ySlow
        }}
        className="absolute top-[-30%] left-1/2 w-[120%] h-[120%] rounded-full opacity-20 blur-[160px]"
      />

      {/* Layer 2 – silver core */}
      <motion.div
        style={{
          background: 'radial-gradient(circle, #94a3b8 0%, transparent 70%)',
          x: xMid
        }}
        className="absolute bottom-[-20%] left-1/2 w-[100%] h-[100%] rounded-full opacity-30 blur-[140px]"
      />

      {/* Layer 3 – highlight */}
      <motion.div
        style={{
          background: 'radial-gradient(circle, #f8fafc 0%, transparent 60%)',
          x: xFast
        }}
        className="absolute top-[10%] left-1/2 w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
      />
      
      {/* Top-right corner glow */}
      <motion.div
        style={{
          background: 'radial-gradient(circle, #e5e7eb 0%, transparent 30%)',
          x: xCorner,
          y: yCorner
        }}
        className="absolute top-[-25%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-12 blur-[120px]"
      />

      {/* Depth vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
    </div>
  );
}