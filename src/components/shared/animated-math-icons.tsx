'use client';

import { useEffect, useState } from 'react';
import { Plus, Minus, X, Divide, Sigma, SquareRadical, Infinity, Percent, Pi } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = [
  Plus,
  Minus,
  X,
  Divide,
  Sigma,
  SquareRadical,
  Infinity,
  Percent,
  Pi
];

type IconStyle = {
  left: string;
  animationDuration: string;
  animationDelay: string;
  size: number;
};

export function AnimatedMathIcons() {
  const [iconStyles, setIconStyles] = useState<IconStyle[]>([]);

  useEffect(() => {
    const generateStyles = () => {
      const styles = Array.from({ length: 20 }).map(() => {
        return {
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 10 + 10}s`, // 10s to 20s
          animationDelay: `${Math.random() * 15}s`, // 0s to 15s
          size: Math.random() * 40 + 20, // 20px to 60px
        };
      });
      setIconStyles(styles);
    };

    generateStyles();
    // No dependencies, so it runs once on mount on client side
  }, []);

  if (iconStyles.length === 0) {
    return null; // Don't render on server or before styles are generated
  }

  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden" aria-hidden="true">
      <div className="relative h-full w-full">
        {iconStyles.map((style, i) => {
          const Icon = icons[i % icons.length];
          return (
            <Icon
              key={i}
              className="math-icon"
              style={{
                  left: style.left,
                  animationDuration: style.animationDuration,
                  animationDelay: style.animationDelay,
                  width: style.size,
                  height: style.size,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
