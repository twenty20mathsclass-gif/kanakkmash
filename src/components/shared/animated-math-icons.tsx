'use client';

import { useState, useEffect } from 'react';
import { Sigma, Plus, Minus, Divide, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const icons = [
  { icon: Sigma, size: 'w-12 h-12' },
  { icon: Plus, size: 'w-8 h-8' },
  { icon: Minus, size: 'w-10 h-10' },
  { icon: Divide, size: 'w-12 h-12' },
  { icon: X, size: 'w-8 h-8' },
];

const colors = [
  'text-primary',
  'text-accent',
  'text-foreground/50',
];

interface AnimatedIcon {
  id: number;
  component: React.ElementType;
  size: string;
  color: string;
  style: {
    top: string;
    left: string;
    animationDuration: string;
    animationDelay: string;
  };
}

export function AnimatedMathIcons() {
  const [generatedIcons, setGeneratedIcons] = useState<AnimatedIcon[]>([]);

  useEffect(() => {
    // Generate icons only on the client-side to avoid hydration mismatch
    const newIcons = Array.from({ length: 15 }).map((_, i) => {
      const IconData = icons[Math.floor(Math.random() * icons.length)];
      return {
        id: i,
        component: IconData.icon,
        size: IconData.size,
        color: colors[Math.floor(Math.random() * colors.length)],
        style: {
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 5 + 5}s`, // 5s to 10s
          animationDelay: `${Math.random() * 5}s`,
        },
      };
    });
    setGeneratedIcons(newIcons);
  }, []); // Empty dependency array ensures this runs only once on mount

  if (generatedIcons.length === 0) {
    return null; // Don't render anything on the server or initial client render
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {generatedIcons.map(({ id, component: Icon, size, color, style }) => (
        <motion.div
          key={id}
          className={cn('absolute', color)}
          style={{ top: style.top, left: style.left }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.7, 0], y: [0, -50, -100] }}
          transition={{
            duration: parseFloat(style.animationDuration),
            delay: parseFloat(style.animationDelay),
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
          }}
        >
          <Icon className={size} />
        </motion.div>
      ))}
    </div>
  );
}
