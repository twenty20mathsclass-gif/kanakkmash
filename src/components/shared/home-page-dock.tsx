'use client';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { House, Newspaper, Library, Users } from 'lucide-react';

export function HomePageDock() {
    const navItems = [
        { href: '/', label: 'Home', icon: House },
        { href: '/blog', label: 'Blog', icon: Newspaper },
        { href: '/materials', label: 'Materials', icon: Library },
        { href: '/community', label: 'Community', icon: Users },
    ];

    return (
        <AppleStyleDock items={navItems} user={null} onSignOut={() => {}} />
    );
}
