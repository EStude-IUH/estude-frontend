"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FilePlus2,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Sparkles,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AccountManagementPanel } from "@/components/admin/account-management-panel";
import { useAuth } from "@/context/auth-context";
import { getRoleLogin, getRoleSessionSettings } from "@/lib/role-routes";

const staffNavItems = [
  { icon: BookOpenCheck, label: "Lớp học", href: undefined },
  { icon: UsersRound, label: "Học viên", href: undefined },
  { icon: ClipboardCheck, label: "Bài tập & chấm điểm", href: undefined },
  { icon: CalendarClock, label: "Lịch giảng dạy", href: undefined },
  { icon: BarChart3, label: "Báo cáo", href: undefined },
];

const managedCourses = [
  {
    code: "DHKTPM18A",
    name: "Phát triển ứng dụng Web",
    students: 46,
    completion: 82,
    nextSession: "Thứ 2, 07:00 · H3.01",
    tone: "from-blue-600 to-cyan-500",
  },
  {
    code: "DHTH19B",
    name: "Cơ sở dữ liệu nâng cao",
    students: 42,
    completion: 74,
    nextSession: "Thứ 3, 09:30 · A2.04",
    tone: "from-violet-600 to-fuchsia-500",
  },
  {
    code: "DHHTTT18C",
    name: "Lập trình hướng đối tượng",
    students: 48,
    completion: 88,
    nextSession: "Thứ 4, 13:00 · H5.02",
    tone: "from-emerald-600 to-teal-500",
  },
];

const upcomingWork = [
  {
    title: "Chấm bài thực hành React",
    detail: "DHKTPM18A · 18 bài chưa chấm",
    due: "Hạn hôm nay",
    urgent: true,
  },
  {
    title: "Đăng tài liệu tuần 6",
    detail: "DHTH19B · Chương giao dịch",
    due: "Ngày mai",
    urgent: false,
  },
  {
    title: "Duyệt câu hỏi thảo luận",
    detail: "DHHTTT18C · 7 câu hỏi mới",
    due: "18/08",
    urgent: false,
  },
];

const activityItems = [
  {
    icon: CheckCircle2,
    title: "Đã công bố điểm giữa kỳ",
    detail: "Lớp DHKTPM18A · 10 phút trước",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: MessageSquareText,
    title: "12 phản hồi mới từ học viên",
    detail: "Chủ đề “Thiết kế REST API” · 35 phút trước",
    tone: "bg-blue-50 text-blue-600",
  },
  {
    icon: UserRoundPlus,
    title: "3 học viên vừa tham gia lớp",
    detail: "Lớp DHTH19B · 1 giờ trước",
    tone: "bg-violet-50 text-violet-600",
  },
];

export function StaffDashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    const loginPath = getRoleLogin(user?.role ?? "TEACHER");
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace(loginPath);
    }
  }

  if (!user) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-slate-950"
        aria-live="polite"
      >
        <LoaderCircle
          className="size-8 animate-spin text-cyan-400"
          aria-hidden="true"
        />
      </main>
    );
  }

  const roleLabel = user.role === "ADMIN" ? "Quản trị viên" : "Giảng viên";
  const firstName = user.fullName.trim().split(/\s+/).at(-1) ?? user.fullName;
  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const dashboardPath =
    user.role === "ADMIN" ? "/admin/dashboard" : "/teacher/dashboard";
  const navItems = [
    { icon: LayoutDashboard, label: "Tổng quan", href: dashboardPath },
    ...(user.role === "ADMIN"
      ? [
          {
            icon: UsersRound,
            label: "Quản lý tài khoản",
            href: "/admin/accounts",
          },
        ]
      : []),
    ...staffNavItems,
  ];
  const isAccountsPage = pathname === "/admin/accounts";
  const activeMenuLabel =
    navItems.find((item) => item.href === pathname)?.label ?? "Tổng quan";
  const sidebarLabelClass = `max-w-[180px] overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity,transform] duration-300 ease-in-out ${
    isSidebarCollapsed
      ? "lg:max-w-0 lg:-translate-x-1 lg:opacity-0"
      : "lg:max-w-[180px] lg:translate-x-0 lg:opacity-100"
  }`;
  const sidebarItemLayout = isSidebarCollapsed
    ? "lg:gap-0 lg:px-[19px]"
    : "";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header
        className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-[padding] duration-300 lg:pr-8 ${
          isSidebarCollapsed ? "lg:pl-[102px]" : "lg:pl-[286px]"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="mr-3 grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="size-5" />
        </button>

        <h1 className="truncate text-lg font-extrabold tracking-tight text-brand-700 sm:text-xl">
          {activeMenuLabel}
        </h1>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Thông báo"
          >
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
              {initials}
            </span>
            <div className="hidden md:block">
              <p className="max-w-44 truncate text-sm font-bold text-slate-900">
                {user.fullName}
              </p>
              <p className="text-xs font-medium text-indigo-600">{roleLabel}</p>
            </div>
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[266px] flex-col border-r border-slate-200 bg-white px-4 pb-6 pt-4 text-slate-900 shadow-xl shadow-slate-900/[0.06] transition-all duration-300 lg:translate-x-0 ${
          isSidebarCollapsed ? "lg:w-[82px] lg:px-3" : "lg:w-[266px]"
        } ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          className="absolute -right-[18px] bottom-28 hidden size-9 place-items-center rounded-full border border-blue-100 bg-white text-brand-600 shadow-md shadow-slate-950/15 transition hover:scale-105 hover:bg-blue-50 hover:text-brand-700 focus:outline-none lg:grid"
          aria-label={
            isSidebarCollapsed
              ? "Mở rộng thanh điều hướng"
              : "Thu gọn thanh điều hướng"
          }
          title={isSidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="size-5" strokeWidth={2.5} />
          ) : (
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          )}
        </button>

        <div
          className={`relative flex items-center px-2 ${
            isSidebarCollapsed ? "lg:justify-center lg:px-0" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[190px] overflow-hidden transition-[max-width] duration-300 ease-in-out ${
              isSidebarCollapsed ? "lg:max-w-[44px]" : "lg:max-w-[190px]"
            }`}
          >
            <BrandLogo withShadow={false} />
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="absolute right-0 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav
          className="mt-4 space-y-1.5"
          aria-label="Điều hướng khu vực điều hành"
        >
          {navItems.map(({ icon: Icon, label, href }) => {
            const active = href === pathname;
            return (
              <button
                type="button"
                key={label}
                onClick={() => {
                  if (href) router.push(href);
                  setIsMenuOpen(false);
                }}
                title={isSidebarCollapsed ? label : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "bg-blue-50 text-brand-700 ring-1 ring-inset ring-blue-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                } ${sidebarItemLayout}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className={sidebarLabelClass}>{label}</span>
                {active ? (
                  <span
                    className={`ml-auto size-1.5 max-w-[6px] shrink-0 rounded-full bg-brand-600 transition-[max-width,margin,opacity,transform] duration-300 ${
                      isSidebarCollapsed
                        ? "lg:ml-0 lg:max-w-0 lg:scale-0 lg:opacity-0"
                        : "lg:scale-100 lg:opacity-100"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-slate-200 pt-5">
          <button
            type="button"
            title={isSidebarCollapsed ? "Trợ giúp" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 ${sidebarItemLayout}`}
          >
            <CircleHelp className="size-5 shrink-0" />
            <span className={sidebarLabelClass}>Trợ giúp</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(getRoleSessionSettings(user.role))}
            title={isSidebarCollapsed ? "Cài đặt" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 ${sidebarItemLayout}`}
          >
            <Settings className="size-5 shrink-0" />
            <span className={sidebarLabelClass}>Cài đặt</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            title={isSidebarCollapsed ? "Đăng xuất" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50 disabled:opacity-60 ${sidebarItemLayout}`}
          >
            {isSigningOut ? (
              <LoaderCircle className="size-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="size-5 shrink-0" />
            )}
            <span className={sidebarLabelClass}>
              {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </span>
          </button>
        </div>
      </aside>

      <main
        className={`min-h-screen px-4 pb-10 pt-[88px] transition-[margin] duration-300 sm:px-6 lg:px-8 ${
          isSidebarCollapsed ? "lg:ml-[82px]" : "lg:ml-[266px]"
        }`}
      >
        <div className={isAccountsPage ? "w-full" : "mx-auto max-w-[1280px]"}>
          {isAccountsPage ? (
            <AccountManagementPanel />
          ) : (
            <>
              <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-9">
                <div className="absolute -right-20 -top-28 size-72 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="absolute -bottom-32 right-40 size-64 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                      <Sparkles className="size-3.5" /> Trung tâm điều hành
                      EStude
                    </span>
                    <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
                      Chào {firstName}, cùng vận hành một ngày hiệu quả.
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                      Theo dõi lớp học, tiến độ học viên và các công việc cần xử
                      lý trong một không gian thống nhất.
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-50"
                    >
                      <FilePlus2 className="size-4" /> Tạo bài tập
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                    >
                      <UserRoundPlus className="size-4" /> Thêm học viên
                    </button>
                  </div>
                </div>
              </section>

              <section
                className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                aria-label="Thống kê điều hành"
              >
                {[
                  {
                    icon: BookOpenCheck,
                    label: "Lớp đang phụ trách",
                    value: "08",
                    note: "3 lớp có lịch hôm nay",
                    tone: "bg-indigo-50 text-indigo-600",
                  },
                  {
                    icon: UsersRound,
                    label: "Học viên",
                    value: "286",
                    note: "+12 trong tháng này",
                    tone: "bg-cyan-50 text-cyan-600",
                  },
                  {
                    icon: ClipboardCheck,
                    label: "Bài cần chấm",
                    value: "34",
                    note: "18 bài đến hạn hôm nay",
                    tone: "bg-amber-50 text-amber-600",
                  },
                  {
                    icon: BarChart3,
                    label: "Tỷ lệ hoàn thành",
                    value: "91%",
                    note: "+4,2% so với kỳ trước",
                    tone: "bg-emerald-50 text-emerald-600",
                  },
                ].map(({ icon: Icon, label, value, note, tone }) => (
                  <article
                    key={label}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                          {value}
                        </p>
                      </div>
                      <span
                        className={`grid size-11 place-items-center rounded-xl ${tone}`}
                      >
                        <Icon className="size-5" />
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{note}</p>
                  </article>
                ))}
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">
                        Lớp học đang hoạt động
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Tổng quan tiến độ và buổi học kế tiếp
                      </p>
                    </div>
                    <button
                      type="button"
                      className="hidden items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 sm:flex"
                    >
                      Xem tất cả <ChevronRight className="size-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {managedCourses.map((course) => (
                      <article
                        key={course.code}
                        className="rounded-2xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <span
                            className={`grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${course.tone}`}
                          >
                            <BookOpenCheck className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {course.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {course.code} · {course.students} học viên
                                </p>
                              </div>
                              <span className="w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                {course.nextSession}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${course.tone}`}
                                  style={{ width: `${course.completion}%` }}
                                />
                              </div>
                              <span className="text-xs font-extrabold text-slate-700">
                                {course.completion}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">
                        Việc cần xử lý
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Ưu tiên trong những ngày tới
                      </p>
                    </div>
                    <CalendarClock className="size-5 text-indigo-600" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {upcomingWork.map((item) => (
                      <article
                        key={item.title}
                        className="rounded-xl border border-slate-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {item.detail}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${item.urgent ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}
                          >
                            {item.due}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight">
                      Hoạt động gần đây
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Cập nhật mới nhất trong các lớp phụ trách
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Xem lịch sử
                  </button>
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {activityItems.map(({ icon: Icon, title, detail, tone }) => (
                    <article
                      key={title}
                      className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4"
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {detail}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
