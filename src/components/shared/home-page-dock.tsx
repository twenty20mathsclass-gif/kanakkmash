'use client';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { House, Newspaper, Quote, ShoppingCart, Users } from 'lucide-react';

export function HomePageDock() {
    const navItems = [
        { href: '/', label: 'Home', icon: House },
        { href: '/blog', label: 'Blog', icon: Newspaper },
        { href: '/testimonials', label: 'Testimonials', icon: Quote },
        { href: '/cart', label: 'Cart', icon: ShoppingCart },
        { href: '/about-us', label: 'About Us', icon: Users },
    ];

    return (
        <AppleStyleDock items={navItems} user={null} />
    );
}
