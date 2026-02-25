'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FloatingActionButtons() {
  const [showGoToTop, setShowGoToTop] = useState(false);
  const pathname = usePathname();

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
