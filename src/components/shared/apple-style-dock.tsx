'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { Dock, DockIcon, DockItem } from '@/components/ui/dock';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import { motion } from 'framer-motion';

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

function DockSeparator() {
    return <div className="h-7 w-px shrink-0 bg-border" />;
}

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

export function AppleStyleDock({ items, user, onSignOut }: { items: NavItem[], user: User | null, onSignOut?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const activePath = items.reduce((closest, item) => {
    if (item.href === '/' && pathname === '/') return '/';
    if (currentUrl.startsWith(item.href) && item.href.length > closest.length && item.href !== '/') {
        return item.href;
    }
    return closest;
  }, pathname === '/' ? '/' : '');

  return (
    <Dock>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activePath === item.href;

        return (
          <DockItem key={item.href}>
            <Link
              href={item.href}
              className="relative flex h-full w-full items-center justify-center rounded-full"
            >
              {isActive && (
                <motion.div
                  layoutId="active-dock-item"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-chart-3 animate-gradient-pan [background-size:200%_auto]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <DockIcon>
                <Icon
                  className={cn(
                    "relative transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover/dock-item:text-foreground"
                  )}
                  strokeWidth={1.2}
                />
                <span className="sr-only">{item.label}</span>
              </DockIcon>
            </Link>
          </DockItem>
        );
      })}

      <DockSeparator />

      <DockItem>
        <Link
          href="https://wa.me/919995315893"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="flex h-full w-full items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#1DA851]"
        >
          <DockIcon>
            <WhatsAppIcon className="h-6 w-6" />
          </DockIcon>
        </Link>
      </DockItem>
    </Dock>
  );
}
