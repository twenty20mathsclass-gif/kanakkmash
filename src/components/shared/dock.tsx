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
  const mouseX = useMotionValue(Infinity);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider>
      <div className="fixed inset-x-0 bottom-6 z-50 flex h-20 items-center justify-center">
        <motion.div
          ref={containerRef}
          onMouseMove={(e) => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              mouseX.set(e.clientX - rect.left);
            }
          }}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="flex h-full items-end gap-3 rounded-2xl bg-card/50 px-3 pb-3 backdrop-blur-md"
          style={{
            boxShadow:
              '0 0 0 1px hsl(var(--border)/.5), 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }}
        >
          {items.map((item) => (
            <DockItem key={item.href} mouseX={mouseX} {...item} />
          ))}
        </motion.div>
      </div>
    </TooltipProvider>
  );
};

type DockItemProps = DockItemData & {
  mouseX: ReturnType<typeof useMotionValue>;
};

const DockItem = ({ href, label, icon: Icon, mouseX }: DockItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = itemRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeSync = useTransform(distance, [-100, 0, 100], [44, 72, 44]);
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
      <TooltipContent side="top">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};
