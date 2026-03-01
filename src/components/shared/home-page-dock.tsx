'use client';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { House, Newspaper, Users, ShoppingCart, Building2 } from 'lucide-react';

export function HomePageDock() {
    const navItems = [
        { href: '/', label: 'Home', icon: House },
        { href: '/blog', label: 'Blog', icon: Newspaper },
        { href: '/community', label: 'Community', icon: Users },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
        { href: '/about-us', label: 'About Us', icon: Building2 },
    ];

    return (
        <AppleStyleDock items={navItems} user={null} />
    );
}
