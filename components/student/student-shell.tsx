"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Settings,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/context/auth-context";
import { getRoleSessionSettings } from "@/lib/role-routes";

interface StudentNavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href?: string;
}

const studentNavItems: StudentNavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Hôm nay",
    href: "/student/dashboard",
  },
  {
    icon: CalendarDays,
    label: "Thời khóa biểu",
  },
  { icon: BookOpen, label: "Môn học", href: "/student/courses" },
  { icon: FileText, label: "Bài tập" },
  { icon: UsersRound, label: "Nhóm học tập" },
];

function isNavItemActive(pathname: string, href?: string): boolean {
  if (!href) return false;

  if (href === "/student/courses") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/student/exams/") ||
      pathname.startsWith("/student/attempts/")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function StudentShellLoading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#f7fafc]"
      aria-live="polite"
    >
      <div className="text-center">
        <LoaderCircle className="mx-auto size-8 animate-spin text-brand-600" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          Đang tải không gian sinh viên...
        </p>
      </div>
    </main>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (!user) return <StudentShellLoading />;

  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7fafc] pb-20 text-slate-950 lg:pb-0">
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1480px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <BrandLogo withShadow={false} />

          <nav
            className="hidden h-full items-center gap-1 lg:flex"
            aria-label="Điều hướng sinh viên"
          >
            {studentNavItems.map(({ icon: Icon, label, href }) => {
              const active = isNavItemActive(pathname, href);

              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => href && router.push(href)}
                  className={`relative flex h-full items-center gap-2 px-3 text-sm font-semibold transition ${
                    active
                      ? "text-brand-700"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon className="size-4" /> {label}
                  {active ? (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="relative grid size-10 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Thông báo"
            >
              <Bell className="size-4.5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-50"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
              >
                <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-xs font-extrabold text-white">
                  {initials}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-40 truncate text-sm font-bold leading-5 text-slate-800">
                    {user.fullName}
                  </span>
                  <span className="block max-w-40 truncate font-mono text-[11px] font-semibold leading-4 text-brand-600">
                    Mã HS: {user.accountName}
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isAccountMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <CircleHelp className="size-4" /> Trợ giúp
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      router.push(getRoleSessionSettings(user.role));
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Settings className="size-4" /> Cài đặt
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {isSigningOut ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <LogOut className="size-4" />
                    )}
                    {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-slate-200 bg-white px-2 lg:hidden"
        aria-label="Điều hướng nhanh"
      >
        {studentNavItems.slice(0, 4).map(({ icon: Icon, label, href }) => {
          const active = isNavItemActive(pathname, href);

          return (
            <button
              type="button"
              key={label}
              onClick={() => href && router.push(href)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${active ? "text-brand-700" : "text-slate-400"}`}
            >
              <Icon className="size-5" /> {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
