'use client';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { House, BookOpen, Newspaper, Library, Users } from 'lucide-react';

export function HomePageDock() {
    const navItems = [
        { href: '/', label: 'Home', icon: House },
        { href: '/courses', label: 'Courses', icon: BookOpen },
        { href: '/blog', label: 'Blog', icon: Newspaper },
        { href: '/materials', label: 'Materials', icon: Library },
        { href: '/community', label: 'Community', icon: Users },
    ];

    return (
        <AppleStyleDock items={navItems} user={null} onSignOut={() => {}} />
    );
}
