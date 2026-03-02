
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@/firebase';
import { UserNav } from './user-nav';

export function MobileLogo({ onSignOut }: { onSignOut?: () => void }) {
  const { user } = useUser();
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
        <div className="h-10 w-10">
            <UserNav user={user} onSignOut={onSignOut} side="bottom" align="end" />
        </div>
      )}
    </div>
  );
}
