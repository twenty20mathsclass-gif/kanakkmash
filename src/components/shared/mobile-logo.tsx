'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';

export function MobileLogo() {
  const isMobile = useIsMobile();
  const { user } = useUser();
  const pathname = usePathname();

  const getHomeHref = () => {
    const publicPaths = ['/courses', '/blog', '/materials', '/community'];
    const isPublicPath = publicPaths.includes(pathname) || pathname === '/';

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

  return (
    <div className="fixed top-4 left-4 z-50 md:hidden">
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
    </div>
  );
}
