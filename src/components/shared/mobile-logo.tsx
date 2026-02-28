'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';
import { UserNav } from './user-nav';

export function MobileLogo({ onSignOut }: { onSignOut?: () => void }) {
  const isMobile = useIsMobile();
  const { user } = useUser();

  // This component is no longer needed as the main header is now responsive.
  return null;

  /*
  if (!isMobile) {
    return null;
  }
  
  const showUserNav = user && onSignOut;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background p-4 md:hidden">
      <Link href="/">
          <Image
              src="/logo mlm@4x.png"
              alt="kanakkmash logo"
              width={144}
              height={44}
              className="h-auto w-36 object-contain"
              priority
          />
      </Link>
      {showUserNav && (
        <UserNav user={user} onSignOut={onSignOut} side="bottom" align="end" />
      )}
    </div>
  );
  */
}
