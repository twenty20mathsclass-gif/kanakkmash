'use client';

import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div
      className="relative h-32 w-32 md:h-40 md:w-40"
      role="status"
    >
      <div
        className="absolute inset-0 animate-spin rounded-full"
        style={{
          background: 'conic-gradient(from 90deg at 50% 50%, #F97917, #FAB422, #BF00B0, #F97917)',
        }}
      ></div>
      <div className="absolute inset-2 rounded-full bg-background"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
            src="/Loading Icon.png"
            width={80}
            height={80}
            alt="Loading..."
            className="w-20 h-20 md:w-24 md:w-24"
            priority
            unoptimized
        />
      </div>
      <span className="sr-only">Loading...</span>
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
