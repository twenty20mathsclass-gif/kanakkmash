'use client';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { House, Newspaper, BarChart3, Users, ShoppingCart, Info } from 'lucide-react';

export function HomePageDock() {
    const navItems = [
        { href: '/', label: 'Home', icon: House },
        { href: '/about-us', label: 'About Us', icon: Info },
        { href: '/blog', label: 'Blog', icon: Newspaper },
        { href: '/materials', label: 'Materials', icon: BarChart3 },
        { href: '/community', label: 'Community', icon: Users },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
    ];

    return (
        <AppleStyleDock items={navItems} user={null} />
    );
}
