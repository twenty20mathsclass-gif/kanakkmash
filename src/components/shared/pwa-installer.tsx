'use client';

import { useEffect } from 'react';

export function PwaInstaller() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    // Registration was successful
                }).catch(registrationError => {
                    // registration failed
                });
            });
        }
    }, []);

    return null;
}
