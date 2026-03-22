
'use client';

import { Suspense, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { usePathname } from 'next/navigation';

import { MobileLogo } from '@/components/shared/mobile-logo';
import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { PublicHeader } from '@/components/shared/public-header';
import { cn } from '@/lib/utils';

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
            <Suspense fallback={null}>
                {/* Mobile fixed header - Stays at top-0 */}
                <MobileLogo user={user} onSignOut={user ? onSignOut : undefined} />
                
                {/* Public Navigation - Hidden on mobile, fixed at the top area */}
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
            <div className="flex-grow flex flex-col w-full min-h-0">
                {/* Fixed Spacers for Desktop Navbars */}
                {!isHomepage && <div className="h-28 hidden md:block shrink-0" />}

                <main className={cn(
                    "flex-grow flex flex-col w-full min-h-0",
                    isHomepage ? "overflow-hidden" : "pt-4 pb-12 px-4 md:px-8 lg:px-12 overflow-y-auto"
                )}>
                    {/* Mobile Spacer for fixed header - Only on subpages to save space on home */}
                    {!isHomepage && <div className="h-16 md:hidden shrink-0" />}

                    <div className={cn(
                        "w-full flex-grow flex flex-col min-h-0",
                        isHomepage ? "justify-center items-center" : ""
                    )}>
                        {children}
                    </div>
                    
                    {/* Footer - Only visible at bottom of scroll on home, or standard on others */}
                    {isHomepage && isPubliclyAccessible && (
                        <footer className="w-full shrink-0 py-2 border-t mt-auto bg-background/50 backdrop-blur-sm">
                            <div className="container px-4 md:px-6">
                                {year && (
                                <p className="text-center text-[10px] sm:text-xs text-foreground/60">
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
