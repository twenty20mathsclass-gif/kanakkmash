'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function Reveal({ children, className }: RevealProps) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}
