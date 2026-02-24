'use client';

import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="flex items-center justify-center">
      <Image
        src="/logoo_1@4x.webp"
        alt="Loading..."
        width={100}
        height={100}
        className="animate-pulse"
        priority
      />
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
