'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
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
import { useState, useEffect } from 'react';

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
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const getHomeHref = () => {
      if (!user) return '/';
      switch(user.role) {
          case 'admin': return '/admin';
          case 'teacher': return '/teacher';
          default: return '/dashboard';
      }
  }
  const homeHref = getHomeHref();


  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const activePath = items.reduce((closest, item) => {
    // Special handling for root/dashboard links
    if (item.href === homeHref || (item.href === '/' && homeHref.startsWith('/'))) {
        if (pathname === homeHref || pathname === '/') {
            return homeHref;
        }
    }
    if (currentUrl.startsWith(item.href) && item.href.length > closest.length && item.href !== '/') {
        return item.href;
    }
    return closest;
  }, '');

  return (
    <>
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link 
            href={homeHref}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
              scrolled && 'border bg-background/80 backdrop-blur-md'
            )}
        >
          <Image src="/lgo ico@4x.webp" alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
        </Link>
      </div>

      <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:top-4 md:bottom-auto'>
        <motion.nav 
          className="flex items-center gap-2 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md h-[60px]"
        >
          <motion.div 
            whileHover={{ scale: 1.15, y: isMobile ? 6 : -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            key="logo" 
            className="hidden md:flex"
          >
              <Link href={homeHref}>
                  <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-full transition-colors"
                  >
                      <Image src="/lgo ico@4x.webp" alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
                  </div>
              </Link>
          </motion.div>
          
          {items.map((item) => {
              const Icon = item.icon;
              
              const isActive = activePath === item.href;

              return (
                  <motion.div 
                    key={item.href}
                    animate={{
                      scale: isActive ? 1.15 : 1,
                      y: isActive && !isMobile ? -6 : 0,
                    }}
                    whileHover={{ scale: 1.15, y: isMobile ? 6 : -6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  >
                      <Link
                          href={item.href}
                          className={cn(
                              "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:text-foreground md:w-auto md:px-4",
                          )}
                      >
                          <div className={cn(
                              "relative z-10 flex items-center",
                              isActive ? 'text-primary-foreground' : ''
                              )}
                          >
                              <Icon className="h-5 w-5" />
                              <span className="hidden md:ml-2 md:block">{item.label}</span>
                          </div>
                          
                          {isActive && (
                          <motion.div
                              layoutId="active-pill"
                              className="absolute inset-0 z-0 rounded-full bg-gradient-to-r from-amber-400 via-primary to-amber-400 bg-[length:200%_auto] animate-gradient-pan"
                              transition={{ type: "spring", duration: 0.6 }}
                          />
                          )}
                      </Link>
                  </motion.div>
              )
          })}

          {user && onSignOut && (
            <>
              <div className="h-6 w-px bg-border mx-1" />
              <motion.div 
                whileHover={{ scale: 1.15, y: isMobile ? 6 : -6 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
              >
                  <UserNav user={user} onSignOut={onSignOut} isMobile={isMobile} />
              </motion.div>
            </>
          )}
        </motion.nav>
      </div>
    </>
  );
}
