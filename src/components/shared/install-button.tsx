'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsClient(true);

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
  
  // By returning null until we're on the client, we ensure the initial server-rendered
  // and client-rendered HTML match, preventing a hydration error.
  if (!isClient) {
    return null;
  }

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
