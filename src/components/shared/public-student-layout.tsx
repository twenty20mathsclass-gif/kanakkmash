
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
        <div className={cn(
            "relative flex flex-col bg-background bg-[radial-gradient(hsl(var(--primary)/.05)_1px,transparent_1px)] [background-size:8px_8px] w-full",
            isHomepage ? "h-svh overflow-hidden" : "min-h-screen"
        )}>
            
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

            {/* Layout content container */}
            <div className={cn(
                "flex-grow flex flex-col w-full",
                isHomepage ? "overflow-hidden" : ""
            )}>
                {/* Fixed Spacer for Navbars - prevents content being hidden behind fixed headers */}
                <div className="h-16 md:hidden shrink-0" />
                {!isHomepage && <div className="h-28 hidden md:block shrink-0" />}

                {/* Sticky Announcement Banner - Pins to top or below mobile header */}
                <div className="sticky top-16 md:top-0 z-40 w-full shrink-0">
                    <AnnouncementBanner />
                </div>

                <main className={cn(
                    "flex-grow flex flex-col w-full",
                    isHomepage ? "justify-center items-center overflow-hidden" : "pt-4 pb-12 px-4 md:px-8 lg:px-12"
                )}>
                    {children}
                </main>
            </div>

            {/* Footer only visible if page fits or on scrolling pages */}
            {isPubliclyAccessible && (
                <footer className="w-full shrink-0 flex flex-col items-center gap-2 py-4 border-t mt-auto bg-background/50 backdrop-blur-sm">
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
