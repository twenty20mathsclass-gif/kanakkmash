'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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

export function FloatingActionButtons() {
  const [showGoToTop, setShowGoToTop] = useState(false);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const handleScroll = () => {
    if (window.scrollY > 200) {
      setShowGoToTop(true);
    } else {
      setShowGoToTop(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on initial render
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  const authPages = ['/sign-in', '/sign-up'];
  if (authPages.includes(pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {!isMobile && (
        <Link
          href="https://wa.me/919995315893"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <Button
            size="icon"
            className="rounded-full bg-[#25D366] text-white hover:bg-[#1DA851] w-14 h-14 shadow-lg"
          >
            <WhatsAppIcon className="h-7 w-7" />
          </Button>
        </Link>
      )}
      
      <div
        className={cn(
          'transition-opacity duration-300',
          showGoToTop ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <Button
          size="icon"
          onClick={scrollToTop}
          className='rounded-full w-14 h-14 shadow-lg'
          aria-label="Go to top"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
