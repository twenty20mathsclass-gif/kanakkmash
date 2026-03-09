'use client';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import type { LucideIcon } from 'lucide-react';

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

export function HomePageDock({ navItems }: { navItems: NavItem[] }) {
    return (
        <AppleStyleDock items={navItems} user={null} />
    );
}
