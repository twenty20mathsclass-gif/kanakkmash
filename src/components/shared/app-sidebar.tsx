"use client";

import type { LucideIcon } from "lucide-react";
import type { User } from "@/lib/definitions";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function AppSidebar({
  items,
  user,
  onSignOut,
}: {
  items: NavItem[];
  user: User;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, setOpenMobile, setOpen, isMobile } = useSidebar();

  const currentUrl = `${pathname}${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  const isActive = (href: string) => {
    if (href.includes("?")) return currentUrl === href;
    return pathname.startsWith(href) && href !== "/";
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-white/70 backdrop-blur-xl border-r border-gray-200 shadow-sm"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* LOGO */}
      <SidebarHeader>
        <Link href="/" className="flex items-center justify-center p-3">
          <Image
            src="/logo mlm@4x.png"
            alt="logo"
            width={120}
            height={40}
            className="transition-all duration-300 group-data-[state=collapsed]:w-10"
          />
        </Link>
      </SidebarHeader>

      {/* MENU */}
      <SidebarContent className="flex flex-col justify-start py-6 scrollbar-thin">
        <SidebarMenu className="gap-2 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={{ children: item.label }}
                  className={cn(
                    "h-11 w-full rounded-xl transition-all duration-200",
                    "flex items-center gap-3 px-4",
                    "text-gray-600",
                    "hover:bg-orange-50 hover:text-orange-600",
                    active && "bg-orange-100 text-orange-700 shadow-sm",
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center w-full gap-3"
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        active
                          ? "text-orange-700"
                          : "text-gray-500 group-hover:text-orange-600",
                      )}
                    />

                    <span className="text-sm font-semibold tracking-tight truncate group-data-[state=collapsed]:hidden">
                      {item.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* FOOTER (FIXED ALIGNMENT) */}
      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-11 flex items-center gap-3 rounded-xl px-3 transition-all",
                "hover:bg-gray-100",
                state === "collapsed" && !isMobile
                  ? "w-11 h-11 p-0 justify-center"
                  : "justify-start",
              )}
            >
              {/* AVATAR */}
              <Avatar className="h-8 w-8 shrink-0 border border-gray-200">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="bg-orange-50 text-orange-600">
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>

              {/* USER INFO */}
              <div className="flex flex-col justify-center text-left leading-tight group-data-[state=collapsed]:hidden">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500 truncate max-w-[140px]">
                  {user.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
