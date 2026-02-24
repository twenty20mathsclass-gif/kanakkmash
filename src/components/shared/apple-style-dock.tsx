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
import { LogOut, UserCircle, LogIn, UserPlus } from 'lucide-react';
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
         <motion.button 
            className="flex items-center justify-center rounded-full h-8 w-8 bg-secondary/80 hover:bg-secondary transition-colors"
         >
            <Avatar className="h-7 w-7">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
         </motion.button>
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

  const navItems = user ? items : [];
  
  // The base "home" link should point to the dashboard for logged-in users, and the landing page for signed-out users.
  const homeHref = user ? (user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/dashboard') : '/';
  
  // Check if home is active. It's active if the current path is the home path, OR if the current path
  // doesn't match any of the more specific nav items. This prevents "Home" from staying active on other pages.
  const isHomeActive = pathname === homeHref || (user && !navItems.some(item => pathname.startsWith(item.href)));

  return (
    <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50'>
      <nav className="flex items-center gap-1 rounded-full border bg-background/80 p-1.5 text-sm font-medium text-muted-foreground backdrop-blur-md">
        
        <Link
            href={homeHref}
            className={cn(
                "relative rounded-full px-4 py-1.5 transition-colors hover:text-foreground",
                {'text-foreground': isHomeActive}
            )}
        >
            <span className="relative z-10">Home</span>
            {isHomeActive && (
                <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 z-0 rounded-full bg-secondary"
                    transition={{ type: "spring", duration: 0.6 }}
                />
            )}
        </Link>
        
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
                "relative rounded-full px-4 py-1.5 transition-colors hover:text-foreground",
                {'text-foreground': pathname.startsWith(item.href)}
            )}
          >
            <span className="relative z-10">{item.label}</span>
            {pathname.startsWith(item.href) && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 z-0 rounded-full bg-secondary"
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
          </Link>
        ))}

        <div className="h-5 w-px bg-border mx-1" />

        {user && onSignOut ? (
            <div className="flex items-center justify-center h-8 w-8">
                <UserNav user={user} onSignOut={onSignOut} />
            </div>
        ) : (
           <>
            <Link href="/sign-in" className={cn(
                "relative flex items-center justify-center rounded-full h-8 w-8 transition-colors hover:bg-secondary",
                {'bg-secondary': pathname === '/sign-in'}
                )}>
                <LogIn className='h-4 w-4 text-muted-foreground' />
            </Link>
            <Link href="/sign-up" className={cn(
                "relative flex items-center justify-center rounded-full h-8 w-8 transition-colors hover:bg-secondary",
                {'bg-secondary': pathname === '/sign-up'}
                )}>
                <UserPlus className='h-4 w-4 text-muted-foreground' />
            </Link>
           </>
        )}
      </nav>
    </div>
  );
}
