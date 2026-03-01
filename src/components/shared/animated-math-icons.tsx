'use client';

import { motion } from 'framer-motion';
import {
  Plus,
  Minus,
  X,
  Divide,
  Sigma,
  Infinity as InfinityIcon,
  SquareRadical,
  Percent,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const icons = [
  Plus,
  Minus,
  X,
  Divide,
  Sigma,
  InfinityIcon,
  SquareRadical,
  Percent,
];

const IconAnimation = () => {
  const [generatedIcons, setGeneratedIcons] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const newIcons = Array.from({ length: 25 }).map((_, i) => {
      const Icon = icons[i % icons.length];
      const size = Math.random() * 30 + 15; // 15px to 45px
      const duration = Math.random() * 20 + 15; // 15s to 35s
      const delay = Math.random() * 15;
      const left = Math.random() * 100;

      return (
        <motion.div
          key={i}
          className="absolute text-primary/30"
          style={{
            left: `${left}%`,
            top: '110%',
            width: size,
            height: size,
          }}
          animate={{
            top: '-10%',
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
          }}
        >
          <Icon className="h-full w-full" />
        </motion.div>
      );
    });
    setGeneratedIcons(newIcons);
  }, []);

  if (!generatedIcons.length) {
    return null;
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {generatedIcons}
    </div>
  );
};

export function AnimatedMathIcons() {
    // This wrapper ensures Math.random is only called client-side
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient ? <IconAnimation /> : null;
}
