'use client';

import { motion } from 'framer-motion';
import { Sigma, Pi, SquareRadical, Infinity } from 'lucide-react';

const icons = [
  { icon: Sigma, color: 'text-primary' },
  { icon: Pi, color: 'text-chart-2' },
  { icon: SquareRadical, color: 'text-chart-3' },
  { icon: Infinity, color: 'text-chart-4' },
];

const containerVariants = {
  start: {
    transition: {
      staggerChildren: 0.4,
    },
  },
  end: {
    transition: {
      staggerChildren: 0.4,
    },
  },
};

const iconVariants = {
  start: {
    opacity: 0,
    y: 20,
    scale: 0.8,
  },
  end: {
    opacity: [0, 1, 1, 0],
    y: [20, 0, 0, -20],
    scale: [0.8, 1, 1, 0.8],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      repeatDelay: (icons.length - 1) * 0.4,
      ease: 'easeInOut',
    },
  },
};

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <motion.div
      className="flex space-x-4"
      variants={containerVariants}
      initial="start"
      animate="end"
    >
      {icons.map((item, i) => (
        <motion.div key={i} variants={iconVariants}>
          <item.icon className={`h-12 w-12 ${item.color}`} strokeWidth={1.5} />
        </motion.div>
      ))}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}
