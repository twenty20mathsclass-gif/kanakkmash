'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirebase } from '@/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

import { AppleStyleDock } from '@/components/shared/apple-style-dock';
import { 
    BookPlus,
    FilePlus2,
    Upload,
    PenSquare,
    TrendingDown,
    TrendingUp,
    UserCheck,
    PlusSquare,
    DollarSign,
    Users, 
    LayoutDashboard,
    Home,
    Calendar,
    PlayCircle,
    MessageSquare,
    User
} from 'lucide-react';
import { PageLoader } from '@/components/shared/page-loader';
import { HomePageDock } from '@/components/shared/home-page-dock';
import { MobileLogo } from '@/components/shared/mobile-logo';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();

  const publicPaths = ['/courses', '/blog', '/materials', '/community'];
  const isPublicPath = publicPaths.includes(pathname);

  if (isPublicPath) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Suspense fallback={null}>
          <MobileLogo />
          <HomePageDock />
        </Suspense>
        <main className="flex-grow p-4 pt-20 pb-24 md:p-6 md:pt-24 lg:p-8 lg:pt-24">{children}</main>
        <footer className="bg-background py-6">
          <div className="container mx-auto flex items-center justify-center px-4 md:px-6">
            <p className="text-sm text-foreground/60">
              © {new Date().getFullYear()} kanakkmash. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  const handleSignOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    router.push('/sign-in');
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <PageLoader />;
  }

  // Student: "Home + Calendar + Courses + Community + Profile"
  const studentNav = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/courses', label: 'Courses', icon: PlayCircle },
    { href: '/community', label: 'Community', icon: MessageSquare },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  // Teacher: "Home + Create Class+ Students' Attendance + Blog Creation + revenue + Study Material "
  const teacherNav = [
    { href: '/teacher', label: 'Home', icon: LayoutDashboard },
    { href: '/teacher/create-class', label: 'Create Class', icon: PlusSquare },
    { href: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/teacher/blog/create', label: 'Blog Creation', icon: PenSquare },
    { href: '/teacher/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/teacher/materials', label: 'Study Material', icon: BookPlus },
  ];

  // Admin: "student Datas + Teacher Datas + Revenue from Student + Revenue Paid to Teachers + Blog Creation + Study material Upload + Mocktest Creator + Course Creator"
  const adminNav = [
    { href: '/admin/users?role=student', label: 'Student Data', icon: Users },
    { href: '/admin/users?role=teacher', label: 'Teacher Data', icon: Users },
    { href: '/admin/revenue/students', label: 'Student Revenue', icon: TrendingUp },
    { href: '/admin/revenue/teachers', label: 'Teacher Payouts', icon: TrendingDown },
    { href: '/admin/blog/create', label: 'Blog Creation', icon: PenSquare },
    { href: '/admin/materials/upload', label: 'Material Upload', icon: Upload },
    { href: '/admin/mock-tests/create', label: 'Mocktest Creator', icon: FilePlus2 },
    { href: '/admin/courses/create', label: 'Course Creator', icon: BookPlus },
  ];

  const navItems =
    user.role === 'admin'
      ? adminNav
      : user.role === 'teacher'
      ? teacherNav
      : studentNav;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={null}>
        <MobileLogo onSignOut={handleSignOut} />
        <AppleStyleDock items={navItems} user={user} onSignOut={handleSignOut} />
      </Suspense>
      <main className="flex-grow p-4 pt-20 pb-24 md:p-6 md:pt-24 lg:p-8 lg:pt-24">{children}</main>
    </div>
  );
}
