
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserNav } from './user-nav';
import type { User } from '@/lib/definitions';

export function MobileLogo({ user, onSignOut }: { user: User | null; onSignOut?: () => void }) {
  const showUserNav = user && onSignOut;
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <div className={cn(
        "fixed left-0 right-0 z-[100] flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-3xl px-4 md:hidden transition-all duration-300",
        isHome ? "top-10" : "top-0"
    )}>
      <Link href="/">
          <Image
              src="/logo mlm@4x.png"
              alt="kanakkmash logo"
              width={144}
              height={44}
              className="h-auto w-36 object-contain"
              priority
              unoptimized
          />
      </Link>
      <div className="h-10 w-10">
          <UserNav user={user} onSignOut={onSignOut} side="bottom" align="end" />
      </div>
    </div>
  );
}
