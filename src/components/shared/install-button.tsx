'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      toast({
        title: 'Installation not available',
        description:
          "Your browser may not support app installation or you may have dismissed the prompt.",
      });
      return;
    }
    (installPrompt as any).prompt();
     // Wait for the user to respond to the prompt
    (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        // No need to do anything here, 'appinstalled' event will handle it
      } else {
        // User dismissed the prompt
      }
    });
  };

  const showButton = isClient && !isStandalone && installPrompt;

  return (
    <AnimatePresence>
      {showButton && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <Button size="lg" variant="secondary" onClick={handleInstallClick}>
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
