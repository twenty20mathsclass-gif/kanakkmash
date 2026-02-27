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
      fill="currentColor"
    >
      <path
        d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.74.45 3.33 1.2 4.74L2.3 22l5.33-1.18a9.9 9.9 0 0 0 4.4 1.18h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.76-1.12-5.26-2.95-7.07A9.82 9.82 0 0 0 12.04 2zM6.55 18.25c-1.23-1.49-1.99-3.3-1.99-5.32 0-4.69 3.81-8.5 8.5-8.5a8.44 8.44 0 0 1 6.01 2.48A8.44 8.44 0 0 1 21.55 12c0 4.69-3.81 8.5-8.5 8.5h-.01c-1.8 0-3.5-.55-4.94-1.52l-5.44 1.21 1.24-5.32zM16.95 14.3c-.28-.14-1.64-.81-1.9-.94-.25-.13-.43-.21-.62.13-.18.34-.72.94-.88 1.13-.16.2-.32.21-.59.11-.28-.1-1.18-.43-2.24-1.36-1.62-1.42-2.1-2.27-2.18-2.39-.08-.12-.18-.21-.18-.33s.12-.18.24-.3c.12-.12.28-.31.42-.46.1-.11.18-.21.28-.36.09-.15.04-.28-.02-.42-.06-.14-.59-1.42-.81-1.94-.23-.54-.46-.46-.62-.47-.16-.01-.34-.01-.52-.01s-.46.06-.7.34c-.23.27-.88.85-.88 2.07 0 1.22.9 2.4 1.03 2.57.13.16 1.78 2.73 4.3 3.78 2.52 1.05 2.52.7 3.02.67.5-.03 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.13-.25-.21-.52-.35z"
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
                        src="/logo eng@4x.png"
                        alt="kanakkmash"
                        width={200}
                        height={62}
                        className="h-full w-auto"
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#1DA851]"
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
                    triggerClassName="bg-secondary/80 hover:bg-secondary" 
                  />
              </motion.div>
            </>
          )}
        </motion.nav>
      </div>
    </>
  );
}
