'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type DockItemData = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const Dock = ({ items }: { items: DockItemData[] }) => {
  const mouseY = useMotionValue(Infinity);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider>
      <div className="dark">
        <div className="fixed inset-y-0 left-6 z-50 flex w-20 items-center justify-center">
          <motion.div
            ref={containerRef}
            onMouseMove={(e) => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                mouseY.set(e.clientY - rect.top);
              }
            }}
            onMouseLeave={() => mouseY.set(Infinity)}
            className="flex w-full flex-col items-center gap-3 rounded-2xl bg-background/50 px-3 py-3 backdrop-blur-md"
            style={{
              boxShadow:
                '0 0 0 1px hsl(var(--border)/.5), 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            }}
          >
            {items.map((item) => (
              <DockItem key={item.href} mouseY={mouseY} {...item} />
            ))}
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
};

type DockItemProps = DockItemData & {
  mouseY: ReturnType<typeof useMotionValue>;
};

const DockItem = ({ href, label, icon: Icon, mouseY }: DockItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseY, (val) => {
    const bounds = itemRef.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - bounds.y - bounds.height / 2;
  });

  const sizeSync = useTransform(distance, [-120, 0, 120], [44, 72, 44]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          ref={itemRef}
          style={{ width: size, height: size }}
          className="flex items-center justify-center"
        >
          <Link
            href={href}
            className={cn(
              'flex h-full w-full items-center justify-center rounded-full bg-secondary text-secondary-foreground/80 shadow-md transition-colors hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </Link>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};
