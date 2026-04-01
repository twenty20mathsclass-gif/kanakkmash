"use client";

import { useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useUser, useFirebase } from "@/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { PageLoader } from "@/components/shared/page-loader";
import { usePresence } from "@/hooks/use-presence";
import dynamic from "next/dynamic";

import {
  BookPlus,
  FilePlus2,
  PenSquare,
  IndianRupee,
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
  Settings,
  Megaphone,
  LayoutGrid,
} from "lucide-react";

const AdminPromoterTeacherLayout = dynamic(
  () => import("./admin-promoter-teacher-layout"),
  {
    loading: () => <PageLoader />,
  },
);
const PublicStudentLayout = dynamic(() => import("./public-student-layout"), {
  loading: () => <PageLoader />,
});

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

  useEffect(() => {
    const authPages = ["/sign-in", "/sign-up"];
    const publiclyAccessiblePaths = [
      "/",
      "/about-us",
      "/blog",
      "/cart",
      "/testimonials",
      "/terms-and-conditions",
      "/my-results",
      "/fee-structure",
      "/assessment-form",
      "/assessment-test",
    ];
    const isPublicBlogPost = /^\/blog\/[^/]+$/.test(pathname);
    const isPubliclyAccessible =
      publiclyAccessiblePaths.includes(pathname) ||
      pathname.startsWith("/courses") ||
      pathname.startsWith("/exam-schedule") ||
      pathname.startsWith("/class-schedule") ||
      pathname.startsWith("/invoice") ||
      isPublicBlogPost;

    if (loading || authPages.some((p) => pathname.startsWith(p))) {
      return;
    }

    if (!user) {
      if (!isPubliclyAccessible) {
        router.push("/sign-in");
      }
      return;
    }

    let targetPath: string;
    if (user.role === "admin") targetPath = "/admin";
    else if (user.role === "teacher") targetPath = "/teacher";
    else if (user.role === "promoter") targetPath = "/promoter";
    else if (user.role === "oga") targetPath = "/oga";
    else targetPath = "/dashboard";

    if (
      pathname === "/dashboard" ||
      pathname === "/teacher" ||
      pathname === "/admin" ||
      pathname === "/promoter" ||
      pathname === "/oga"
    ) {
      router.replace(targetPath);
    }

    if (pathname.startsWith("/admin") && user.role !== "admin") {
      router.replace("/dashboard");
    } else if (pathname.startsWith("/teacher") && user.role !== "teacher") {
      router.replace("/dashboard");
    } else if (pathname.startsWith("/promoter") && user.role !== "promoter") {
      router.replace("/dashboard");
    } else if (pathname.startsWith("/oga") && user.role !== "oga") {
      router.replace("/dashboard");
    }
  }, [loading, user, router, pathname]);

  const handleSignOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    router.push("/sign-in");
  };

  if (loading) {
    return <PageLoader />;
  }

  const authPages = ["/sign-in", "/sign-up"];
  if (authPages.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  const publicNav = [
    { href: "/", label: "Home", icon: Home },
    { href: "/blog", label: "Blog", icon: Newspaper },
    { href: "/testimonials", label: "Testimonials", icon: Quote },
    { href: "/cart", label: "Cart", icon: ShoppingCart },
    { href: "/about-us", label: "About Us", icon: Users },
  ];

  const studentNav = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/class-schedule", label: "Class Schedule", icon: Calendar },
    { href: "/recorded-classes", label: "Recorded", icon: Youtube },
    { href: "/exam-schedule", label: "Exam Schedule", icon: FileText },
    { href: "/my-results", label: "My Results", icon: Award },
    { href: "/my-chat-room", label: "My Chat Room", icon: MessagesSquare },
  ];

  const teacherNav = [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/attendance", label: "Attendance", icon: UserCheck },
    {
      href: "/teacher/create-schedule",
      label: "Create Class",
      icon: CalendarPlus,
    },
    {
      href: "/teacher/create-exam-schedule",
      label: "Create Exam",
      icon: FilePenLine,
    },
    { href: "/teacher/exams", label: "Exam Management", icon: FilePenLine },
    {
      href: "/teacher/recorded-classes",
      label: "Recorded Classes",
      icon: Youtube,
    },
    { href: "/my-chat-room", label: "My Chat Room", icon: MessagesSquare },
    { href: "/teacher/revenue", label: "My Revenue", icon: Banknote },
    { href: "/my-referrals", label: "My Referrals", icon: Share2 },
    { href: "/teacher/blog/create", label: "Blog Creation", icon: PenSquare },
    { href: "/teacher/course-cart", label: "Course Cart", icon: ShoppingBag },
  ];

  const promoterNav = [
    { href: "/promoter", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-referrals", label: "My Referrals", icon: Share2 },
    { href: "/promoter/rewards", label: "Reward History", icon: Banknote },
  ];

  const ogaNav = [
    { href: "/oga", label: "Dashboard", icon: LayoutDashboard },
    { href: "/oga/questions", label: "Assessment Questions", icon: FilePenLine },
    { href: "/oga/settings", label: "Test Settings", icon: Settings },
  ];

  const adminNav = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/admin/course-model-controller",
      label: "Course Model Controller",
      icon: LayoutGrid,
    },
    { href: "/admin/schedules", label: "Schedules History", icon: History },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/promoters", label: "Promoters", icon: Share2 },
    { href: "/admin/student-results", label: "Student Results", icon: Award },
    { href: "/my-chat-room", label: "My Chat Room", icon: MessagesSquare },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    {
      href: "/admin/recorded-classes",
      label: "Recorded Classes",
      icon: Youtube,
    },
    { href: "/admin/course-cart", label: "Course Cart", icon: ShoppingBag },
    { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
    { href: "/admin/blog/create", label: "Blog Creator", icon: PenSquare },
    { href: "/admin/courses/create", label: "Course Creator", icon: BookPlus },
    { href: "/admin/fees", label: "Fee Management", icon: IndianRupee },
    {
      href: "/admin/accountant/salaries",
      label: "Teacher Salaries",
      icon: Banknote,
    },
    {
      href: "/admin/accountant/invoices",
      label: "Student Invoices",
      icon: Receipt,
    },
  ];

  let layout;
  const isHomepage = pathname === "/";

  if (
    user &&
    !isHomepage &&
    (user.role === "admin" ||
      user.role === "teacher" ||
      user.role === "promoter" ||
      user.role === "oga")
  ) {
    let navItems;
    if (user.role === "admin") navItems = adminNav;
    else if (user.role === "teacher") navItems = teacherNav;
    else if (user.role === "oga") navItems = ogaNav;
    else navItems = promoterNav;

    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const pageTitle =
      navItems.find((item) => {
        if (
          item.href === "/admin" ||
          item.href === "/teacher" ||
          item.href === "/promoter" ||
          item.href === "/oga"
        ) {
          return pathname === item.href;
        }
        return pathname.startsWith(item.href) && item.href !== "/";
      })?.label || "Dashboard";

    layout = (
      <AdminPromoterTeacherLayout
        navItems={navItems}
        user={user}
        onSignOut={handleSignOut}
        pageTitle={pageTitle}
      >
        {children}
      </AdminPromoterTeacherLayout>
    );
  } else {
    layout = (
      <PublicStudentLayout
        user={user}
        onSignOut={handleSignOut}
        publicNav={publicNav}
        studentNav={studentNav}
      >
        {children}
      </PublicStudentLayout>
    );
  }

  return (
    <>
      {user && <PresenceManager />}
      <Suspense fallback={<PageLoader />}>{layout}</Suspense>
    </>
  );
}
