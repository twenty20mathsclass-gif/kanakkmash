'use client';

import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="flex items-center justify-center">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-spin rounded-full bg-gradient-to-r from-primary to-accent" />
        <div className="absolute inset-2 flex items-center justify-center rounded-full bg-background">
          <Image
            src="/Loading Icon.png"
            alt="Loading..."
            width={56}
            height={56}
            className="h-14 w-14"
            priority
            unoptimized
          />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}
