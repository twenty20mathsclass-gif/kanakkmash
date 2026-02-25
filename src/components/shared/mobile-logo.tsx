'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';
import { UserNav } from './user-nav';

export function MobileLogo({ onSignOut }: { onSignOut?: () => void }) {
  const isMobile = useIsMobile();
  const { user } = useUser();
  const pathname = usePathname();

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


  if (!isMobile) {
    return null;
  }
  
  const showUserNav = user && onSignOut;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between md:hidden">
      <Link href={homeHref}>
          <Image
              src="/logoo_1@4x.webp"
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
