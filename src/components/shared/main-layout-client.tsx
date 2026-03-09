
'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { AppSidebar } from '@/components/shared/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

import { 
    BookPlus,
    FilePlus2,
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
    ShoppingBag,
    Quote,
    History,
    Banknote,
    Receipt,
    MessagesSquare,
    Share2,
    Award,
    Newspaper,
    Youtube,
} from 'lucide-react';
import { HomePageDock } from '@/components/shared/home-page-dock';
import { MobileLogo } from '@/components/shared/mobile-logo';
import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { PublicHeader } from '@/components/shared/public-header';
import { PageLoader } from '@/components/shared/page-loader';
import { usePresence } from '@/hooks/use-presence';


function PresenceManager() {
    usePresence();
    return null;
}

export default function MainLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const authPages = ['/sign-in', '/sign-up'];
    const publiclyAccessiblePaths = ['/', '/about-us', '/blog', '/cart', '/testimonials', '/terms-and-conditions', '/my-results'];
    const isPublicBlogPost = /^\/blog\/[^/]+$/.test(pathname);
    const isPubliclyAccessible = publiclyAccessiblePaths.includes(pathname) || pathname.startsWith('/courses') || pathname.startsWith('/exam-schedule') || pathname.startsWith('/class-schedule') || isPublicBlogPost;

    if (loading || authPages.some(p => pathname.startsWith(p))) {
      return;
    }

    if (!user) {
      if (!isPubliclyAccessible) {
        router.push('/sign-in');
      }
      return;
    }

    if (pathname.startsWith('/admin') && user.role !== 'admin') {
      router.replace('/dashboard');
    } else if (pathname.startsWith('/teacher') && user.role !== 'teacher') {
      router.replace('/dashboard');
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const authPages = ['/sign-in', '/sign-up'];
  if (authPages.some(p => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  if (loading) {
    return <PageLoader />;
  }

  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const handleSignOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    router.push('/sign-in');
  };

  const publiclyAccessiblePaths = ['/', '/about-us', '/blog', '/cart', '/testimonials', '/terms-and-conditions', '/my-results'];
  const isPublicBlogPost = /^\/blog\/[^/]+$/.test(pathname);
  const isPubliclyAccessible = publiclyAccessiblePaths.includes(pathname) || pathname.startsWith('/courses') || pathname.startsWith('/exam-schedule') || pathname.startsWith('/class-schedule') || isPublicBlogPost;
  
  const publicNav = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/blog', label: 'Blog', icon: Newspaper },
    { href: '/testimonials', label: 'Testimonials', icon: Quote },
    { href: '/cart', label: 'Cart', icon: ShoppingCart },
    { href: '/about-us', label: 'About Us', icon: Users },
  ];

  const studentNav = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/class-schedule', label: 'Class Schedule', icon: Calendar },
    { href: '/recorded-classes', label: 'Recorded', icon: Youtube },
    { href: '/exam-schedule', label: 'Exam Schedule', icon: FileText },
    { href: '/my-results', label: 'My Results', icon: Award },
    { href: '/my-chat-room', label: 'My Chat Room', icon: MessagesSquare },
  ];

  const teacherNav = [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/teacher/create-schedule', label: 'Create Class', icon: CalendarPlus },
    { href: '/teacher/create-exam-schedule', label: 'Create Exam', icon: FilePenLine },
    { href: '/teacher/recorded-classes', label: 'Recorded Classes', icon: Youtube },
    { href: '/my-chat-room', label: 'My Chat Room', icon: MessagesSquare },
    { href: '/teacher/revenue', label: 'My Revenue', icon: Banknote },
    { href: '/teacher/my-referrals', label: 'My Referrals', icon: Share2 },
    { href: '/teacher/blog/create', label: 'Blog Creation', icon: PenSquare },
    { href: '/teacher/course-cart', label: 'Course Cart', icon: ShoppingBag },
  ];

  const adminNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/schedules', label: 'Schedules History', icon: History },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/recorded-classes', label: 'Recorded Classes', icon: Youtube },
    { href: '/admin/course-cart', label: 'Course Cart', icon: ShoppingBag },
    { href: '/admin/testimonials', label: 'Testimonials', icon: Quote },
    { href: '/admin/blog/create', label: 'Blog Creator', icon: PenSquare },
    { href: '/admin/courses/create', label: 'Course Creator', icon: BookPlus },
    { href: '/admin/mock-tests/create', label: 'Mocktest Creator', icon: FilePlus2 },
    { href: '/admin/fees', label: 'Fee Management', icon: DollarSign },
    { href: '/admin/accountant/salaries', label: 'Teacher Salaries', icon: Banknote },
    { href: '/admin/accountant/invoices', label: 'Student Invoices', icon: Receipt },
    { href: '/admin/revenue/students', label: 'Student Revenue', icon: TrendingUp },
    { href: '/admin/revenue/teachers', label: 'Teacher Payouts', icon: TrendingDown },
  ];

  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    const navItems = user.role === 'admin' ? adminNav : teacherNav;
    const pageTitle = navItems.find(item => currentUrl.startsWith(item.href) && item.href !== '/admin' && item.href !== '/teacher')?.label || 'Dashboard';

    return (
      <SidebarProvider>
        <PresenceManager />
        <div className="flex min-h-screen">
            <AppSidebar items={navItems} user={user} onSignOut={handleSignOut} />
            <div className="flex flex-col flex-1 md:ml-[--sidebar-width-icon] group-data-[state=expanded]:md:ml-[--sidebar-width] transition-[margin-left] duration-300 ease-in-out">
                <header className="p-4 border-b h-16 flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="font-semibold text-lg">{pageTitle}</h1>
                </header>
                <main className="flex-grow p-4 md:p-6 bg-muted/30">
                    <div className="mx-auto w-full max-w-screen-2xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
      </SidebarProvider>
    );
  }
    
  return (
    <div className="relative min-h-[100svh] bg-background flex flex-col">
      {user && <PresenceManager />}
      <Suspense fallback={null}>
        <MobileLogo user={user} onSignOut={user ? handleSignOut : undefined} />
        {user ? (
          <>
            <div className="hidden md:block">
              <PublicHeader user={user} onSignOut={handleSignOut} navItems={studentNav} />
            </div>
            <div className="fixed bottom-2 left-0 right-0 z-50 md:hidden">
              <AppleStyleDock items={studentNav} user={user} onSignOut={handleSignOut} />
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
      <main className="flex-grow p-4 pt-28 pb-28 md:pt-24 md:px-6 lg:px-8">{children}</main>
      {isPubliclyAccessible && (
        <footer className="bg-background py-6">
          <div className="container mx-auto flex items-center justify-center px-4 md:px-6">
            {year && (
              <p className="text-sm text-foreground/60">
                © {year} kanakkmash. All rights reserved.
              </p>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
