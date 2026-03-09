'use client';

import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="grid h-64 w-64 place-content-center">
      {/* The spinner div, absolutely positioned */}
      <div
        className="col-start-1 row-start-1 h-56 w-56 animate-spin rounded-full border-8 border-solid border-transparent border-t-primary border-r-accent"
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
          className="h-32 w-32"
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
