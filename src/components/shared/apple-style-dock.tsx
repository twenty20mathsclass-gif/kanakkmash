'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function UserNav({ user, onSignOut, isMobile }: { user: User, onSignOut: () => void, isMobile: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         <button 
            className="flex items-center justify-center rounded-full h-12 w-12 bg-secondary/80 hover:bg-secondary transition-colors"
         >
            <Avatar className="h-11 w-11">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
         </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-popover/80 border-border text-popover-foreground backdrop-blur-md mb-2 md:mt-2 md:mb-0" 
        side={isMobile ? 'top' : 'bottom'} 
        align="end"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-popover-foreground">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
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

export function AppleStyleDock({ items, user, onSignOut }: { items: NavItem[], user: User | null, onSignOut?: () => void }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const animationProps = {
    whileHover: { scale: 1.15, y: -6 },
    transition: { type: "spring", stiffness: 400, damping: 12 },
  };

  const activePath = items.reduce((closest, item) => {
    if (pathname.startsWith(item.href) && item.href.length > closest.length) {
        return item.href;
    }
    return closest;
  }, (pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/teacher')) ? pathname : '');


  return (
    <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:top-4 md:bottom-auto'>
      <motion.nav 
        className="flex items-end gap-2 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md h-[60px]"
      >
        <motion.div {...animationProps} key="logo">
            <div
                className="relative flex h-12 w-12 items-center justify-center rounded-full transition-colors"
            >
                <Image src="/lgo ico@4x.webp" alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
            </div>
        </motion.div>
        
        {items.map((item) => {
            const Icon = item.icon;
            
            // Logic to determine if the current item is active.
            // It's active if its href is the longest matching prefix of the current path.
            // For the root path, it must be an exact match.
            const isActive = item.href === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.href) && item.href === activePath;

            return (
                <motion.div {...animationProps} key={item.href}>
                    <Link
                        href={item.href}
                        className={cn(
                            "relative flex h-12 items-center justify-center rounded-full transition-colors hover:text-foreground w-12 md:w-auto md:px-4",
                            {'text-foreground': isActive}
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="relative z-10 hidden md:ml-2 md:block">{item.label}</span>
                        {isActive && (
                        <motion.div
                            layoutId="active-pill"
                            className="absolute inset-0 z-0 rounded-full bg-accent"
                            transition={{ type: "spring", duration: 0.6 }}
                        />
                        )}
                    </Link>
                </motion.div>
            )
        })}

        {user && onSignOut && (
          <>
            <div className="h-6 w-px bg-border mx-1 self-center" />
            <motion.div {...animationProps}>
                <UserNav user={user} onSignOut={onSignOut} isMobile={isMobile} />
            </motion.div>
          </>
        )}
      </motion.nav>
    </div>
  );
}
