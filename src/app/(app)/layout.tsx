'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { AppSidebar } from '@/components/shared/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import { 
    BookPlus,
    FilePlus2,
    Upload,
    PenSquare,
    TrendingDown,
    TrendingUp,
    PlusSquare,
    DollarSign,
    Users, 
    LayoutDashboard,
    Home,
    Calendar,
    ShoppingCart,
    BookOpen,
    CalendarPlus,
    UserCheck,
    FileText,
    FilePenLine,
    ShoppingBag
} from 'lucide-react';
import { HomePageDock } from '@/components/shared/home-page-dock';
import { MobileLogo } from '@/components/shared/mobile-logo';
import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { useIsMobile } from '@/hooks/use-mobile';
import { PublicHeader } from '@/components/shared/public-header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = usePathname();
  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const isMobile = useIsMobile();


  // Paths that can be viewed without being logged in.
  const publiclyAccessiblePaths = ['/', '/blog', '/materials', '/community', '/cart'];
  const isPubliclyAccessible = publiclyAccessiblePaths.includes(pathname) || pathname.startsWith('/courses');

  const handleSignOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    router.push('/sign-in');
  };

  useEffect(() => {
    if (loading) {
      return; // Wait for user/loading state to settle
    }

    if (!user) {
      // Not logged in: only allow public paths
      if (!isPubliclyAccessible) {
        router.push('/sign-in');
      }
      return;
    }

    // Logged in: check role-based access
    // Protect admin routes
    if (pathname.startsWith('/admin') && user.role !== 'admin') {
      router.replace('/dashboard'); // Redirect to student dashboard as a safe default
      return;
    }

    // Protect teacher routes
    if (pathname.startsWith('/teacher') && user.role !== 'teacher') {
      router.replace('/dashboard'); // Redirect to student dashboard
      return;
    }
  }, [loading, user, router, isPubliclyAccessible, pathname]);

  if (loading || (!user && !isPubliclyAccessible)) {
    return null;
  }

  // Define nav items for logged-in users
  const studentNav = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/calendar', label: 'Class Schedule', icon: Calendar },
    { href: '/courses', label: 'Exam Schedule', icon: FileText },
    { href: '/cart', label: 'Cart', icon: ShoppingCart },
  ];

  const teacherNav = [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/students', label: 'Students', icon: Users },
    { href: '/teacher/create-schedule', label: 'Create Class', icon: CalendarPlus },
    { href: '/teacher/create-exam-schedule', label: 'Create Exam', icon: FilePenLine },
    { href: '/teacher/materials', label: 'Study Material', icon: BookPlus },
    { href: '/teacher/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/teacher/blog/create', label: 'Blog Creation', icon: PenSquare },
    { href: '/teacher/course-cart', label: 'Course Cart', icon: ShoppingBag },
  ];

  const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users?role=student', label: 'Students', icon: Users },
    { href: '/admin/users?role=teacher', label: 'Teachers', icon: Users },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/revenue/students', label: 'Student Revenue', icon: TrendingUp },
    { href: '/admin/revenue/teachers', label: 'Teacher Payouts', icon: TrendingDown },
    { href: '/admin/blog/create', label: 'Blog Creation', icon: PenSquare },
    { href: '/admin/materials/upload', label: 'Material Upload', icon: Upload },
    { href: '/admin/mock-tests/create', label: 'Mocktest Creator', icon: FilePlus2 },
    { href: '/admin/courses/create', label: 'Course Creator', icon: BookPlus },
    { href: '/admin/course-cart', label: 'Course Cart', icon: ShoppingBag },
  ];

  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    const navItems = user.role === 'admin' ? adminNav : teacherNav;
    const pageTitle = navItems.find(item => currentUrl.startsWith(item.href) && item.href !== '/')?.label || 'Dashboard';

    return (
      <SidebarProvider>
        <div className="flex min-h-screen">
            <AppSidebar items={navItems} user={user} onSignOut={handleSignOut} />
            <div className="flex flex-col flex-1 md:ml-[--sidebar-width-icon] group-data-[state=expanded]:md:ml-[--sidebar-width] transition-[margin-left] duration-300 ease-in-out">
                <header className="p-4 border-b h-16 flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="font-semibold text-lg">{pageTitle}</h1>
                </header>
                <main className="flex-grow p-4 md:p-6 bg-muted/30">
                    {children}
                </main>
            </div>
        </div>
      </SidebarProvider>
    );
  }
    
  return (
    <div className="relative min-h-screen bg-background">
      <Suspense fallback={null}>
        <MobileLogo onSignOut={handleSignOut} />
        {user && (
          isMobile ? (
            <div className="fixed bottom-2 left-0 right-0 z-50">
              <AppleStyleDock items={studentNav} user={user} onSignOut={handleSignOut} />
            </div>
          ) : (
            <PublicHeader user={user} onSignOut={handleSignOut} />
          )
        )}
        {!user && isPubliclyAccessible && (
          isMobile === false ? <PublicHeader /> : (
            <div className="fixed bottom-2 left-0 right-0 z-50">
              <HomePageDock />
            </div>
          )
        )}
      </Suspense>
      <main className="flex-grow p-4 pt-28 pb-28 md:pt-24 md:px-6 lg:px-8">{children}</main>
      {isPubliclyAccessible && (
        <footer className="bg-background py-6">
          <div className="container mx-auto flex items-center justify-center px-4 md:px-6">
            <p className="text-sm text-foreground/60">
              © {new Date().getFullYear()} kanakkmash. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
