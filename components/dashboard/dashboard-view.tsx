"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Settings,
  UsersRound,
  Video,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/context/auth-context";
import { getRoleSessionSettings } from "@/lib/role-routes";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Hôm nay",
    href: "/student/dashboard",
  },
  {
    icon: ClipboardCheck,
    label: "Bài kiểm tra",
    href: "/student/exams",
  },
  { icon: CalendarDays, label: "Thời khóa biểu" },
  { icon: BookOpen, label: "Môn học" },
  { icon: FileText, label: "Bài tập" },
  { icon: UsersRound, label: "Nhóm học tập" },
];

const weekDays = [
  { short: "T2", date: "17", label: "Thứ Hai", highlighted: true },
  { short: "T3", date: "18", label: "Thứ Ba", highlighted: false },
  { short: "T4", date: "19", label: "Thứ Tư", highlighted: false },
  { short: "T5", date: "20", label: "Thứ Năm", highlighted: false },
  { short: "T6", date: "21", label: "Thứ Sáu", highlighted: false },
];

const timeSlots = ["07:00", "09:30", "13:00", "15:30"];

const timetable = [
  {
    day: 0,
    time: "07:00",
    subject: "Lập trình hướng đối tượng",
    room: "H5.02",
    mode: "Trực tiếp",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    day: 0,
    time: "13:00",
    subject: "Phát triển ứng dụng Web",
    room: "H3.01",
    mode: "Trực tiếp",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    day: 1,
    time: "09:30",
    subject: "Cơ sở dữ liệu",
    room: "A2.04",
    mode: "Trực tiếp",
    tone: "border-violet-200 bg-violet-50 text-violet-800",
  },
  {
    day: 2,
    time: "07:00",
    subject: "Kiến trúc máy tính",
    room: "Online",
    mode: "Trực tuyến",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    day: 3,
    time: "13:00",
    subject: "Cơ sở dữ liệu",
    room: "A2.04",
    mode: "Thực hành",
    tone: "border-violet-200 bg-violet-50 text-violet-800",
  },
  {
    day: 4,
    time: "09:30",
    subject: "Phát triển ứng dụng Web",
    room: "H3.01",
    mode: "Thực hành",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
];

const assignments = [
  {
    title: "Bài tập React Hooks",
    subject: "Phát triển ứng dụng Web",
    due: "Hôm nay · 23:59",
    urgent: true,
  },
  {
    title: "Thiết kế lược đồ quan hệ",
    subject: "Cơ sở dữ liệu",
    due: "Ngày mai · 20:00",
    urgent: false,
  },
  {
    title: "Bài tập kế thừa",
    subject: "Lập trình hướng đối tượng",
    due: "20/08 · 23:59",
    urgent: false,
  },
];

const courses = [
  {
    name: "Lập trình hướng đối tượng",
    teacher: "ThS. Nguyễn Minh Khoa",
    progress: 72,
    tone: "bg-blue-600",
  },
  {
    name: "Cơ sở dữ liệu",
    teacher: "TS. Trần Hoàng Anh",
    progress: 58,
    tone: "bg-violet-500",
  },
  {
    name: "Phát triển ứng dụng Web",
    teacher: "ThS. Lê Thanh Phúc",
    progress: 84,
    tone: "bg-emerald-500",
  },
];

function LoadingScreen() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#f7fafc]"
      aria-live="polite"
    >
      <div className="text-center">
        <LoaderCircle className="mx-auto size-8 animate-spin text-brand-600" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          Đang tải thời khóa biểu...
        </p>
      </div>
    </main>
  );
}

export function StudentDashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node))
        setIsAccountMenuOpen(false);
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

  if (!user) return <LoadingScreen />;

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
            {navItems.map(({ icon: Icon, label, href }) => {
              const active = href
                ? pathname === href || pathname.startsWith(`${href}/`)
                : false;

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
                <span className="hidden max-w-36 truncate text-sm font-bold text-slate-800 sm:block">
                  {user.fullName}
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
                    onClick={() =>
                      router.push(getRoleSessionSettings(user.role))
                    }
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
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-extrabold text-slate-950">
                  Thời khóa biểu tuần
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  17 – 21 tháng 8, 2026
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
                Học kỳ 1 · 2026–2027
              </span>
            </header>

            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                <div className="grid grid-cols-[74px_repeat(5,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/70">
                  <div />
                  {weekDays.map((day) => (
                    <div
                      key={day.short}
                      className={`border-l border-slate-100 px-3 py-3 text-center ${day.highlighted ? "bg-blue-50" : ""}`}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {day.short}
                      </p>
                      <p
                        className={`mt-0.5 text-lg font-extrabold ${day.highlighted ? "text-brand-700" : "text-slate-800"}`}
                      >
                        {day.date}
                      </p>
                    </div>
                  ))}
                </div>

                {timeSlots.map((time) => (
                  <div
                    key={time}
                    className="grid grid-cols-[74px_repeat(5,minmax(0,1fr))] border-b border-slate-100 last:border-b-0"
                  >
                    <div className="px-3 py-4 text-center text-xs font-bold text-slate-400">
                      {time}
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const session = timetable.find(
                        (item) => item.day === dayIndex && item.time === time,
                      );
                      return (
                        <div
                          key={`${day.short}-${time}`}
                          className={`min-h-[106px] border-l border-slate-100 p-2 ${day.highlighted ? "bg-blue-50/30" : ""}`}
                        >
                          {session ? (
                            <article
                              className={`h-full rounded-xl border p-3 ${session.tone}`}
                            >
                              <p className="line-clamp-2 text-xs font-extrabold leading-4">
                                {session.subject}
                              </p>
                              <div className="mt-2 flex items-center gap-1 text-[11px] opacity-75">
                                {session.mode === "Trực tuyến" ? (
                                  <Video className="size-3" />
                                ) : (
                                  <MapPin className="size-3" />
                                )}
                                {session.room}
                              </div>
                              <p className="mt-1 text-[10px] font-semibold opacity-65">
                                {session.mode}
                              </p>
                            </article>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <ClipboardCheck className="size-5" />
                </span>
                <div>
                  <h2 className="font-extrabold text-slate-950">
                    Bài kiểm tra được giao
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Xem bài sắp diễn ra, bắt đầu hoặc tiếp tục bài đang làm.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/student/exams")}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                Xem và làm bài kiểm tra <ChevronRight className="size-4" />
              </button>
            </section>

            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-cyan-500 p-5 text-white shadow-lg shadow-brand-700/15">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  Buổi học tiếp theo
                </span>
                <Clock3 className="size-5 text-blue-100" />
              </div>
              <p className="mt-5 text-2xl font-extrabold">07:00 · Thứ Hai</p>
              <h2 className="mt-2 text-lg font-bold">
                Lập trình hướng đối tượng
              </h2>
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-100">
                <MapPin className="size-4" /> Phòng H5.02
              </div>
              <button
                type="button"
                className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-brand-700 transition hover:bg-blue-50"
              >
                Xem chi tiết <ChevronRight className="size-4" />
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold">Sắp đến hạn</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    3 bài tập cần chú ý
                  </p>
                </div>
                <FileText className="size-5 text-amber-500" />
              </div>
              <div className="mt-4 space-y-3">
                {assignments.map((assignment) => (
                  <article
                    key={assignment.title}
                    className="rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 size-2 shrink-0 rounded-full ${assignment.urgent ? "bg-rose-500" : "bg-amber-400"}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {assignment.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {assignment.subject}
                        </p>
                        <p
                          className={`mt-2 text-xs font-semibold ${assignment.urgent ? "text-rose-600" : "text-amber-600"}`}
                        >
                          {assignment.due}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold">Tiến độ môn học</h2>
              <p className="mt-1 text-xs text-slate-500">
                Tiếp tục từ nội dung gần nhất
              </p>
            </div>
            <button
              type="button"
              className="text-sm font-bold text-brand-600 hover:text-brand-800"
            >
              Xem tất cả
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {courses.map((course) => (
              <article
                key={course.name}
                className="rounded-2xl border border-slate-100 p-4 transition hover:border-brand-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-brand-600">
                    <BookOpen className="size-5" />
                  </span>
                  <span className="text-sm font-extrabold text-slate-700">
                    {course.progress}%
                  </span>
                </div>
                <h3 className="mt-3 truncate text-sm font-extrabold text-slate-900">
                  {course.name}
                </h3>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {course.teacher}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${course.tone}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-slate-200 bg-white px-2 lg:hidden"
        aria-label="Điều hướng nhanh"
      >
        {navItems.slice(0, 4).map(({ icon: Icon, label, href }) => {
          const active = href
            ? pathname === href || pathname.startsWith(`${href}/`)
            : false;

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
