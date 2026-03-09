'use client';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div
      className="h-24 w-24 animate-spin rounded-full border-8 border-solid border-primary border-t-transparent md:h-32 md:w-32"
      role="status"
    >
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
