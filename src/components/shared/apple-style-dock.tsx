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

  const navItems = user ? items : [];
  
  const homeHref = user ? (user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/dashboard') : '/';
  
  const isHomeActive = pathname === homeHref || (user && !navItems.some(item => pathname.startsWith(item.href)));

  const animationProps = {
    whileHover: { scale: 1.15, y: -6 },
    transition: { type: "spring", stiffness: 400, damping: 12 },
  };

  return (
    <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50'>
      <motion.nav 
        className="flex items-end gap-2 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md h-[52px]"
      >
        
        <motion.div {...animationProps}>
            <Link
                href={homeHref}
                className={cn(
                    "relative block rounded-full px-4 py-2 transition-colors hover:text-foreground",
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
        </motion.div>
        
        {navItems.map((item) => (
            <motion.div {...animationProps} key={item.href}>
                <Link
                    href={item.href}
                    className={cn(
                        "relative block rounded-full px-4 py-2 transition-colors hover:text-foreground",
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
            </motion.div>
        ))}

        <div className="h-6 w-px bg-border mx-1 self-center" />

        {user && onSignOut ? (
            <motion.div {...animationProps}>
                <UserNav user={user} onSignOut={onSignOut} />
            </motion.div>
        ) : (
           <>
            <motion.div {...animationProps}>
                <Link href="/sign-in" className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary",
                    {'bg-secondary': pathname === '/sign-in'}
                    )}>
                    <LogIn className='h-5 w-5 text-muted-foreground' />
                </Link>
            </motion.div>
            <motion.div {...animationProps}>
                <Link href="/sign-up" className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary",
                    {'bg-secondary': pathname === '/sign-up'}
                    )}>
                    <UserPlus className='h-5 w-5 text-muted-foreground' />
                </Link>
            </motion.div>
           </>
        )}
      </motion.nav>
    </div>
  );
}
