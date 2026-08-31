"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FilePlus2,
  Library,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  School,
  Settings,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/context/auth-context";
import { getRoleSessionSettings } from "@/lib/role-routes";

interface WorkspaceLink {
  href?: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export function AssessmentShell({
  children,
  student = false,
}: {
  children: ReactNode;
  student?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeAccountMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node))
        setIsAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", closeAccountMenu);
    return () => document.removeEventListener("mousedown", closeAccountMenu);
  }, []);

  const links: WorkspaceLink[] = student
    ? [
        {
          href: "/student/dashboard",
          label: "Tổng quan",
          icon: LayoutDashboard,
        },
        { href: "/student/exams", label: "Bài kiểm tra", icon: ClipboardCheck },
      ]
    : [
        { href: "/teacher/dashboard", label: "Lịch học", icon: CalendarDays },
        {
          href: "/teacher/classes",
          label: "Lớp học được phân công",
          icon: School,
        },
        {
          href: "/teacher/materials",
          label: "Thư viện tài liệu",
          icon: Library,
        },
        {
          href: "/teacher/question-bank",
          label: "Ngân hàng câu hỏi",
          icon: FilePlus2,
        },
        { href: "/teacher/exams", label: "Bài kiểm tra", icon: ClipboardCheck },
      ];

  const initials =
    user?.fullName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ?? "ES";
  const roleLabel = student ? "Sinh viên" : "Giảng viên";
  const sidebarLabelClass = `max-w-[180px] overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity,transform] duration-300 ${isSidebarCollapsed ? "lg:max-w-0 lg:-translate-x-1 lg:opacity-0" : "lg:max-w-[180px] lg:translate-x-0 lg:opacity-100"}`;
  const workspaceTitle = getWorkspaceTitle(pathname, links);

  async function handleSignOut() {
    setIsAccountMenuOpen(false);
    await signOut();
    router.replace(student ? "/login" : "/teacher/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header
        className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-[padding] lg:pr-8 ${isSidebarCollapsed ? "lg:pl-[92px]" : "lg:pl-[286px]"}`}
      >
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="mr-3 grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate text-base font-bold tracking-tight text-brand-700 sm:text-lg">
          {workspaceTitle}
        </h1>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Thông báo"
          >
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((value) => !value)}
              className="flex items-center gap-3 rounded-xl p-1.5 text-left hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
                {initials}
              </span>
              {user ? (
                <span className="hidden md:block">
                  <span className="block max-w-44 truncate text-sm font-bold text-slate-900">
                    {user.fullName}
                  </span>
                  <span className="block text-xs font-medium text-indigo-600">
                    {roleLabel}
                  </span>
                </span>
              ) : null}
              <ChevronDown
                className={`hidden size-4 text-slate-400 transition-transform md:block ${isAccountMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isAccountMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
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
                    if (user) router.push(getRoleSessionSettings(user.role));
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
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Đóng menu"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[266px] flex-col border-r border-slate-200 bg-white px-4 pb-6 pt-4 shadow-xl shadow-slate-900/[0.06] transition-all duration-300 lg:translate-x-0 ${isSidebarCollapsed ? "lg:w-[72px] lg:px-2" : "lg:w-[266px]"} ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((value) => !value)}
          className="absolute -right-[18px] bottom-28 hidden size-9 place-items-center rounded-full border border-blue-100 bg-white text-brand-600 shadow-md lg:grid"
          aria-label="Thu gọn menu"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </button>
        <div className="relative flex items-center">
          <div
            className={`box-border max-w-[190px] overflow-hidden px-2 transition-[max-width,padding] ${isSidebarCollapsed ? "lg:max-w-[56px] lg:px-[6px]" : "lg:max-w-[190px] lg:px-2"}`}
          >
            <BrandLogo withShadow={false} />
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="absolute right-0 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="mt-4 space-y-1.5" aria-label="Điều hướng khu vực">
          {links.map(({ href, label, icon: Icon }, index) => {
            const active = Boolean(href && pathname.startsWith(href));
            return (
              <div key={`${label}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (href) router.push(href);
                    setIsMenuOpen(false);
                  }}
                  title={isSidebarCollapsed ? label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${active ? "bg-brand-600 text-white ring-1 ring-inset ring-brand-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"} ${isSidebarCollapsed ? "lg:gap-0 lg:px-[18px]" : ""}`}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className={sidebarLabelClass}>{label}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </aside>
      <main
        className={`min-h-screen px-3.5 pb-8 pt-[74px] transition-[margin] ${isSidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[266px]"}`}
      >
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={action ? "mb-4 flex justify-end" : "sr-only"}>
      <div className="sr-only">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function LoadingPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">
      <LoaderCircle className="mx-auto size-5 animate-spin text-brand-600" />
      <span className="mt-2 block">Đang tải dữ liệu...</span>
    </div>
  );
}
export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
      {message}
    </div>
  );
}

function getWorkspaceTitle(pathname: string, links: WorkspaceLink[]): string {
  if (pathname === "/teacher/question-bank/generate")
    return "Tạo câu hỏi bằng AI";
  if (pathname === "/teacher/question-bank/new") return "Tạo câu hỏi mới";
  if (/^\/teacher\/question-bank\/[^/]+\/edit$/.test(pathname))
    return "Chỉnh sửa câu hỏi";
  if (pathname === "/teacher/exams/new") return "Tạo bài kiểm tra";
  if (/^\/teacher\/exams\/[^/]+\/submissions\/[^/]+$/.test(pathname))
    return "Chấm bài";
  if (/^\/teacher\/exams\/[^/]+\/submissions$/.test(pathname))
    return "Danh sách bài nộp";
  if (/^\/teacher\/exams\/[^/]+$/.test(pathname))
    return "Chi tiết bài kiểm tra";
  if (/^\/student\/attempts\/[^/]+\/result$/.test(pathname))
    return "Kết quả bài làm";
  if (/^\/student\/attempts\/[^/]+$/.test(pathname)) return "Làm bài kiểm tra";
  return (
    links.find((item) => item.href && pathname.startsWith(item.href))?.label ??
    "Tổng quan"
  );
}
