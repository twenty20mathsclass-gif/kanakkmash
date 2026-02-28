'use client';

import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
            <Image
                src="/fv.png"
                alt="kanakkmash logo"
                width={128}
                height={128}
                className="h-32 w-32"
                priority
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
