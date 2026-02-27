'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19.05 4.94A9.91 9.91 0 0 0 12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.33 1.2 4.74L2 22l5.26-1.2C8.67 21.55 10.26 22 12 22c5.52 0 10-4.48 10-10 0-2.76-1.12-5.26-2.95-7.06zM12 20.5c-1.58 0-3.08-.43-4.36-1.21l-.31-.18-3.23.85.87-3.15-.2-.33A8.44 8.44 0 0 1 3.5 12c0-4.69 3.81-8.5 8.5-8.5s8.5 3.81 8.5 8.5-3.81 8.5-8.5 8.5zM16.95 14.3c-.28-.14-1.64-.81-1.9-1.07-.25-.13-.43-.21-.62.13-.18.34-.72.81-.88 1.07-.16.25-.32.28-.59.18-.28-.1-.99-.36-2.2-1.35-1.03-.84-1.74-1.87-1.94-2.21-.2-.34-.02-.52.12-.66.12-.13.28-.34.42-.5.14-.17.18-.28.28-.47.09-.18.04-.36-.02-.51-.06-.14-.62-1.48-.84-2.02-.23-.54-.46-.46-.62-.47-.16-.01-.34-.01-.52-.01s-.46.06-.7.34c-.23.27-.88.85-.88 2.07 0 1.22.9 2.4 1.03 2.57.13.16 1.78 2.73 4.3 3.78 2.52 1.05 2.52.7 3.02.67.5-.03 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.13-.25-.21-.52-.35z"
      />
    </svg>
  );
}

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

export function AppleStyleDock({ items, user, onSignOut }: { items: NavItem[], user: User | null, onSignOut?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder or null on the server to avoid hydration mismatch
    // A simple div with height can prevent layout shift
    return <div className="fixed bottom-4 left-1/2 z-50 h-[56px] -translate-x-1/2 md:top-4 md:bottom-auto" />;
  }

  const getHomeHref = () => {
    const publicPaths = ['/courses', '/blog', '/materials', '/community'];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/';

    if (!user || isPublicPath) return '/';

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

  const simpleHover = { scale: 1.1 };
  const simpleTransition = { type: "tween", ease: "easeOut", duration: 0.2 };


  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:top-4 md:bottom-auto">
        <motion.nav
          className={cn(
            "flex h-[56px] items-center justify-center gap-2 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md"
          )}
        >
          {!isMobile && (
            <>
                <Link href={homeHref} className="flex h-10 items-center justify-center px-3">
                    <Image
                        src="/logoo@4x.webp"
                        alt="kanakkmash"
                        width={100}
                        height={31}
                        className="h-auto"
                        priority
                    />
                </Link>
                <div className="h-full w-px bg-border mx-1 self-center" />
            </>
          )}

          {items.map((item) => {
              const Icon = item.icon;
              
              const isActive = activePath === item.href;

              return (
                  <motion.div 
                    key={item.href}
                    whileHover={simpleHover}
                    transition={simpleTransition}
                  >
                      <Link
                          href={item.href}
                          className={cn(
                              "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                              isMobile ? "justify-center items-center" : "md:w-auto md:px-4"
                          )}
                      >
                          <div className={cn(
                              "relative z-10 flex items-center",
                              isActive ? 'text-primary-foreground' : ''
                              )}
                          >
                              <Icon className="h-5 w-5" />
                              <span className={cn("hidden", isMobile ? "" : "md:ml-2 md:block")}>{item.label}</span>
                          </div>
                          
                          {isActive && (
                          <motion.div
                              layoutId="active-pill"
                              className="absolute inset-0 z-0 rounded-full bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_auto] animate-gradient-pan"
                              transition={{ type: "spring", duration: 0.6 }}
                          />
                          )}
                      </Link>
                  </motion.div>
              )
          })}

          <div className="h-full w-px bg-border mx-1 self-center" />
          <motion.div 
            whileHover={simpleHover}
            transition={simpleTransition}
          >
            <Link
              href="https://wa.me/919995315893"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#1DA851] transition-colors"
            >
                <WhatsAppIcon className="h-6 w-6" />
            </Link>
          </motion.div>
          
          <motion.div 
            whileHover={simpleHover}
            transition={simpleTransition}
          >
            <ThemeToggle />
          </motion.div>

          {user && onSignOut && !isMobile && (
            <>
              <div className="h-full w-px bg-border mx-1 self-center" />
              <motion.div 
                whileHover={simpleHover}
                transition={simpleTransition}
              >
                  <UserNav 
                    user={user} 
                    onSignOut={onSignOut} 
                    triggerClassName="bg-secondary/80 hover:bg-secondary h-10 w-10" 
                  />
              </motion.div>
            </>
          )}
        </motion.nav>
      </div>
    </>
  );
}
