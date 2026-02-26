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
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="currentColor"
      {...props}
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99 0-3.903-.52-5.586-1.456l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.451-4.437-9.885-9.888-9.885-5.451 0-9.885 4.434-9.888 9.885.002 2.17.637 4.288 1.873 6.039l-.989 3.655 3.745-1.017z"/>
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
    return <div className="fixed bottom-4 left-1/2 z-50 h-[60px] -translate-x-1/2 md:top-4 md:bottom-auto" />;
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

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 md:top-4 md:bottom-auto">
        <motion.nav
          className={cn(
            "flex h-[60px] justify-center gap-2 rounded-full border bg-background/80 p-2 text-sm font-medium text-muted-foreground backdrop-blur-md",
            "flex items-center"
          )}
        >
          {!isMobile && (
             <>
                <Link href={homeHref} className="flex items-center justify-center h-10 w-auto px-2">
                    <Image
                        src="/kanakkmash mlm@4x.webp"
                        alt="kanakkmash logo"
                        width={112}
                        height={35}
                        className="h-auto object-contain"
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
                    whileHover={{ scale: 1.2, y: isMobile ? -8 : 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  >
                      <Link
                          href={item.href}
                          className={cn(
                              "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors md:w-auto md:px-4",
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
            whileHover={{ scale: 1.2, y: isMobile ? -8 : 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
          >
            <Link
              href="https://wa.me/919995315893"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex items-center justify-center rounded-full h-10 w-10 bg-[#25D366] text-white hover:bg-[#1DA851] transition-colors"
            >
                <WhatsAppIcon className="h-7 w-7" />
            </Link>
          </motion.div>

          {user && onSignOut && !isMobile && (
            <>
              <div className="h-full w-px bg-border mx-1 self-center" />
              <motion.div 
                whileHover={{ scale: 1.2, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
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
