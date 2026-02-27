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
        d="M12.031 2.188c-5.453 0-9.875 4.422-9.875 9.875 0 1.82.492 3.531 1.359 5.016L2.063 22l5.328-1.438a9.854 9.854 0 004.64 1.25h.016c5.453 0 9.875-4.422 9.875-9.875S17.484 2.188 12.03 2.188zM17.5 15.938c-.14.281-.516.453-.969.516-.453.063-.922.063-1.406-.094-1.531-.5-2.828-1.484-3.828-2.765-.328-.422-.672-.922-.672-1.484s.219-.844.422-1.078c.203-.234.453-.281.609-.281.141 0 .297.016.422.016.188 0 .344-.062.531.297.188.36.656 1.578.719 1.688.062.109.094.265 0 .406-.093.14-.218.234-.39.375-.172.14-.297.219-.406.328-.11.11-.235.266-.109.5.125.235.547.907 1.156 1.485.797.765 1.469 1.031 1.672 1.125.203.093.328.078.438-.047.109-.125.484-.578.625-.781.14-.219.281-.234.469-.156.187.094 1.219.578 1.422.672.203.093.359.14.406.219.047.078.047.437-.172.875z"
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
