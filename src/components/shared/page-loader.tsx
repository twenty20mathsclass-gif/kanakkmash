'use client';

import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="grid h-48 w-48 place-content-center md:h-64 md:w-64">
      {/* The spinner div, absolutely positioned */}
      <div
        className="col-start-1 row-start-1 h-40 w-40 animate-spin rounded-full border-8 border-solid border-transparent border-t-primary border-r-accent md:h-56 md:w-56"
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>

      {/* The icon in the center */}
      <div className="col-start-1 row-start-1 flex items-center justify-center">
        <Image
          src="/Loading Icon.png"
          alt="Loading..."
          width={128}
          height={128}
          className="h-24 w-24 md:h-32 md:w-32"
          priority
          unoptimized
        />
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
