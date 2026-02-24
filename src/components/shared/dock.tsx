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
import { Logo } from './logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle } from 'lucide-react';
import type { User } from '@/lib/definitions';


type DockItemData = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const Dock = ({ items, user, onSignOut }: { items: DockItemData[], user: User, onSignOut: () => void }) => {
  const mouseY = useMotionValue(Infinity);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider>
      <div className="fixed inset-y-0 left-6 z-50 flex w-20 items-center justify-center">
        <div 
          className="flex h-full max-h-[700px] w-full flex-col items-center justify-between rounded-2xl bg-white p-3"
          style={{
            boxShadow:
              '0 0 0 1px hsl(var(--border)/.5), 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }}
        >
          <div className="pt-2">
            <Logo />
          </div>
          <motion.div
            ref={containerRef}
            onMouseMove={(e) => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                mouseY.set(e.clientY - rect.top);
              }
            }}
            onMouseLeave={() => mouseY.set(Infinity)}
            className="flex flex-col items-center gap-3"
          >
            {items.map((item) => (
              <DockItem key={item.label} mouseY={mouseY} {...item} />
            ))}
          </motion.div>
          <div className="pb-2">
            <UserNav user={user} onSignOut={onSignOut} />
          </div>
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
              'flex h-full w-full items-center justify-center rounded-full bg-secondary text-primary shadow-md transition-colors hover:bg-border'
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


function UserNav({ user, onSignOut }: { user: User, onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
            <UserCircle className="mr-2 h-4 w-4"/>
            Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <button onClick={onSignOut} className="w-full cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
