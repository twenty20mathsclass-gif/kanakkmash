'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const symbols = [
  { id: 1, char: '∑', top: '15%', left: '10%' },
  { id: 2, char: '∫', top: '70%', left: '15%' },
  { id: 3, char: 'π', top: '25%', left: '85%' },
  { id: 4, char: '∞', top: '80%', left: '80%' },
  { id: 5, char: '√', top: '40%', left: '75%' },
  { id: 6, char: 'θ', top: '50%', left: '20%' },
  { id: 7, char: 'Δ', top: '10%', left: '40%' },
  { id: 8, char: 'μ', top: '85%', left: '40%' },
  { id: 9, char: '+', top: '35%', left: '5%' },
  { id: 10, char: '÷', top: '60%', left: '90%' },
  { id: 11, char: '−', top: '80%', left: '25%' },
  { id: 12, char: '×', top: '15%', left: '60%' },
];

export function FloatingMathBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-white shadow-inner"></div>
      
      {symbols.map((symbol) => (
        <motion.div
           key={symbol.id}
           className="absolute text-5xl md:text-8xl font-black text-primary/10 select-none"
           style={{ top: symbol.top, left: symbol.left }}
           initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
           animate={{
             y: [0, -30, 0, 40, 0],
             x: [0, 25, 0, -25, 0],
             rotate: [0, 20, -10, 0],
             opacity: [0.6, 0.9, 0.6],
           }}
           transition={{
             duration: 15 + (symbol.id % 5) * 5,
             repeat: Infinity,
             ease: "easeInOut",
             times: [0, 0.25, 0.5, 0.75, 1]
           }}
        >
          {symbol.char}
        </motion.div>
      ))}
    </div>
  );
}
