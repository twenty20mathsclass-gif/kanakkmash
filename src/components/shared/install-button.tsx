'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      toast({
        title: 'Installation not available',
        description:
          "Your browser hasn't made the app installable. You may have already installed it or recently dismissed the prompt.",
      });
      return;
    }
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then(
      (choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          // The app was installed.
        } else {
          // The user dismissed the prompt.
        }
        setInstallPrompt(null);
      }
    );
  };

  return (
    <div className="mt-6">
      <Button variant="secondary" onClick={handleInstallClick}>
        <Image
          src="/fv.png"
          alt="PWA Icon"
          width={20}
          height={20}
          className="mr-2"
        />
        Install Web App
      </Button>
    </div>
  );
}
