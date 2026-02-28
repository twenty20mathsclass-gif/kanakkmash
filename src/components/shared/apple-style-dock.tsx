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

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 448 512"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      fill="currentColor"
    >
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
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
    return <div className="fixed bottom-4 left-1/2 z-50 h-[56px] md:h-16 -translate-x-1/2 md:top-4 md:bottom-auto" />;
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
      <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 md:top-4 md:bottom-auto md:w-auto md:max-w-none">
        <div className="flex justify-center overflow-x-auto scrollbar-hide">
          <motion.nav
            className={cn(
              "flex h-[56px] flex-shrink-0 items-center justify-center gap-1 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md md:h-16 md:gap-2"
            )}
          >
            <Link href={homeHref} className="hidden h-10 items-center justify-center px-2 md:flex md:h-12 md:px-3">
                <div className="relative h-6 w-auto aspect-[150/47] md:h-8">
                    <Image
                        src="/logo mlm@4x.png"
                        alt="kanakkmash"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </Link>
            <div className="hidden h-full w-px bg-border mx-1 self-center md:block" />

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
                                "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors md:h-12",
                                isMobile ? "justify-center items-center" : "md:w-auto md:px-4"
                            )}
                        >
                            <div className={cn(
                                "relative z-10 flex items-center gap-2",
                                isActive ? 'text-primary-foreground' : ''
                                )}
                            >
                                <Icon className="h-5 w-5 md:h-6 md:w-6" />
                                <span className={cn("hidden text-base", isMobile ? "" : "md:block")}>{item.label}</span>
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
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#1DA851] md:h-12 md:w-12"
              >
                  <WhatsAppIcon className="h-6 w-6 md:h-7 md:w-7" />
              </Link>
            </motion.div>

            {user && onSignOut && (
              <>
                <div className="h-full w-px bg-border mx-1 self-center" />
                <UserNav 
                  user={user} 
                  onSignOut={onSignOut} 
                  triggerClassName="bg-secondary/80 hover:bg-secondary h-10 w-10 md:h-12 md:w-12" 
                />
              </>
            )}
          </motion.nav>
        </div>
      </div>
    </>
  );
}
