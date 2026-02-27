
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';
import { UserNav } from './user-nav';

export function MobileLogo({ onSignOut }: { onSignOut?: () => void }) {
  const isMobile = useIsMobile();
  const { user } = useUser();

  if (!isMobile) {
    return null;
  }
  
  const showUserNav = user && onSignOut;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between md:hidden">
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
}
