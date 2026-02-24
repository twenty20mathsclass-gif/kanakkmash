'use client';

import Link from 'next/link';
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

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function UserNav({ user, onSignOut }: { user: User, onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         <button 
            className="flex items-center justify-center rounded-full h-10 w-10 bg-secondary/80 hover:bg-secondary transition-colors"
         >
            <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
         </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2 bg-popover/80 border-border text-popover-foreground backdrop-blur-md" side="bottom" align="end">
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

  const animationProps = {
    whileHover: { scale: 1.15, y: -6 },
    transition: { type: "spring", stiffness: 400, damping: 12 },
  };

  const primaryLink = user 
    ? items.find(item => ['/dashboard', '/admin', '/teacher'].includes(item.href))
    : items.find(item => item.href === '/');

  return (
    <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50'>
      <motion.nav 
        className="flex items-end gap-2 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md h-[52px]"
      >
        
        {items.map((item) => {
            const Icon = item.icon;
            let isActive = false;
            
            if (primaryLink && item.href === primaryLink.href) {
                const otherItems = items.filter(i => i.href !== primaryLink.href);
                isActive = !otherItems.some(other => pathname.startsWith(other.href) && other.href !== '/');
                if (item.href === '/') {
                    isActive = pathname === '/';
                }
            } else {
                isActive = item.href !== '/' && pathname.startsWith(item.href);
            }

            return (
                <motion.div {...animationProps} key={item.href}>
                    <Link
                        href={item.href}
                        className={cn(
                            "relative flex h-10 items-center justify-center rounded-full transition-colors hover:text-foreground w-10 md:w-auto md:px-4",
                            {'text-foreground': isActive}
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="relative z-10 hidden md:ml-2 md:block">{item.label}</span>
                        {isActive && (
                        <motion.div
                            layoutId="active-pill"
                            className="absolute inset-0 z-0 rounded-full bg-secondary"
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
                <UserNav user={user} onSignOut={onSignOut} />
            </motion.div>
          </>
        )}
      </motion.nav>
    </div>
  );
}
