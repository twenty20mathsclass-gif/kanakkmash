
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <Image
          src="/logo mlm@4x.png"
          alt="Loading..."
          width={120}
          height={37}
          priority
        />
      </motion.div>
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
