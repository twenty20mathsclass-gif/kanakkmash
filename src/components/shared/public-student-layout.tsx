
'use client';

import { Suspense, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { usePathname } from 'next/navigation';

import { HomePageDock } from '@/components/shared/home-page-dock';
import { MobileLogo } from '@/components/shared/mobile-logo';
import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { PublicHeader } from '@/components/shared/public-header';
import { cn } from '@/lib/utils';
import { AnnouncementBanner } from '@/components/home/announcement-banner';

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

export default function PublicStudentLayout({
    children,
    user,
    onSignOut,
    publicNav,
    studentNav,
}: {
    children: React.ReactNode;
    user: User | null;
    onSignOut: () => void;
    publicNav: NavItem[];
    studentNav: NavItem[];
}) {
    const pathname = usePathname();
    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    const publiclyAccessiblePaths = ['/', '/about-us', '/blog', '/cart', '/testimonials', '/terms-and-conditions', '/my-results', '/fee-structure'];
    const isPublicBlogPost = /^\/blog\/[^/]+$/.test(pathname);
    const isPubliclyAccessible = publiclyAccessiblePaths.includes(pathname) || pathname.startsWith('/courses') || pathname.startsWith('/exam-schedule') || pathname.startsWith('/class-schedule') || isPublicBlogPost;
    const isHomepage = pathname === '/';

    return (
        <div className={cn("relative flex flex-col min-h-screen bg-background bg-[radial-gradient(hsl(var(--primary)/.05)_1px,transparent_1px)] [background-size:8px_8px]")}>
            <Suspense fallback={null}>
                <MobileLogo user={user} onSignOut={user ? onSignOut : undefined} />
                {user ? (
                <>
                    <div className="hidden md:block">
                    <PublicHeader user={user} onSignOut={onSignOut} navItems={studentNav} />
                    </div>
                    <div className="fixed bottom-2 left-0 right-0 z-50 md:hidden">
                    <AppleStyleDock items={studentNav} user={user} onSignOut={onSignOut} />
                    </div>
                </>
                ) : (
                <>
                    <div className="hidden md:block">
                    <PublicHeader navItems={publicNav} />
                    </div>
                    <div className="fixed bottom-2 left-0 right-0 z-50 md:hidden">
                    <HomePageDock navItems={publicNav} />
                    </div>
                </>
                )}
            </Suspense>
            
            <div className="w-full pt-20 md:pt-24 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
                <AnnouncementBanner />
            </div>

            <main className={cn(
                "flex-grow flex flex-col",
                isHomepage ? "justify-center items-center" : "pb-12 px-4 md:px-6 lg:px-8"
            )}>
                {children}
            </main>

            {isPubliclyAccessible && (
                <footer className="w-full shrink-0 flex flex-col items-center gap-2 py-4">
                    <div className="container px-4 md:px-6">
                        {year && (
                        <p className="text-center text-sm text-foreground/60">
                            © {year} kanakkmash. All rights reserved.
                        </p>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
}
