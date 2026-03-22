
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

    const isHomepage = pathname === '/';
    const publiclyAccessiblePaths = ['/', '/about-us', '/blog', '/cart', '/testimonials', '/terms-and-conditions', '/my-results', '/fee-structure'];
    const isPublicBlogPost = /^\/blog\/[^/]+$/.test(pathname);
    const isPubliclyAccessible = publiclyAccessiblePaths.includes(pathname) || pathname.startsWith('/courses') || pathname.startsWith('/exam-schedule') || pathname.startsWith('/class-schedule') || isPublicBlogPost;

    return (
        <div className={cn(
            "relative flex flex-col bg-background bg-[radial-gradient(hsl(var(--primary)/.05)_1px,transparent_1px)] [background-size:8px_8px] w-full",
            isHomepage ? "h-svh overflow-hidden" : "min-h-screen"
        )}>
            
            {/* Desktop Sticky Announcement Banner - At the absolute top of the viewport scroll */}
            <div className="sticky top-0 z-40 w-full shrink-0 hidden md:block">
                <AnnouncementBanner />
            </div>

            <Suspense fallback={null}>
                {/* Mobile fixed header - Stays at top-0 */}
                <MobileLogo user={user} onSignOut={user ? onSignOut : undefined} />
                
                {/* Public Navigation - Hidden on mobile, fixed below announcement bar on desktop */}
                {user ? (
                    <div className="hidden md:block">
                        <PublicHeader user={user} onSignOut={onSignOut} navItems={studentNav} />
                    </div>
                ) : (
                    <div className="hidden md:block">
                        <PublicHeader navItems={publicNav} />
                    </div>
                )}

                {/* Bottom Dock for Mobile */}
                <div className="fixed bottom-2 left-0 right-0 z-50 md:hidden">
                    <AppleStyleDock items={user ? studentNav : publicNav} user={user} onSignOut={onSignOut} />
                </div>
            </Suspense>

            {/* Layout content container */}
            <div className={cn(
                "flex-grow flex flex-col w-full min-h-0",
                isHomepage ? "" : ""
            )}>
                {/* Fixed Spacers for Desktop Navbars */}
                {!isHomepage && <div className="h-28 hidden md:block shrink-0" />}

                <main className={cn(
                    "flex-grow flex flex-col w-full min-h-0",
                    isHomepage ? "overflow-y-auto" : "pt-4 pb-12 px-4 md:px-8 lg:px-12"
                )}>
                    {/* Mobile Spacer for fixed header */}
                    <div className="h-16 md:hidden shrink-0" />

                    {/* Mobile Sticky Announcement Banner - Positioned inside main scroller so it sticks to top-16 (under fixed header) */}
                    <div className="sticky top-0 md:hidden z-40 w-full shrink-0">
                        <div className="relative">
                            {/* This sub-container actually handles the sticky offset logic */}
                            <div className="sticky top-0">
                                <AnnouncementBanner />
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "w-full flex-grow flex flex-col",
                        isHomepage ? "justify-center items-center py-4" : ""
                    )}>
                        {children}
                    </div>
                    
                    {/* Footer - Only visible at bottom of scroll on home, or standard on others */}
                    {isHomepage && isPubliclyAccessible && (
                        <footer className="w-full shrink-0 py-4 border-t mt-auto bg-background/50 backdrop-blur-sm">
                            <div className="container px-4 md:px-6">
                                {year && (
                                <p className="text-center text-xs text-foreground/60">
                                    © {year} kanakkmash. All rights reserved.
                                </p>
                                )}
                            </div>
                        </footer>
                    )}
                </main>
            </div>

            {/* Standard Footer for non-homepage scroll */}
            {!isHomepage && isPubliclyAccessible && (
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
