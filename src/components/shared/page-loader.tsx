'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export function PageLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const loaderContent = (
    <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ clipPath: 'circle(0% at 50% 50%)' }}
              animate={{ clipPath: 'circle(100% at 50% 50%)' }}
              transition={{ 
                  duration: 1.5,
                  ease: 'easeInOut', 
                  repeat: Infinity, 
                  repeatType: 'mirror'
                }}
            >
                <Image
                    src="/fv.png"
                    alt="kanakkmash logo"
                    width={128}
                    height={128}
                    className="h-32 w-32"
                    priority
                />
            </motion.div>
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
