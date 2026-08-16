'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/context/auth-context';
import { getRoleSessionSettings } from '@/lib/role-routes';

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', active: true },
  { icon: BookOpen, label: 'Khóa học' },
  { icon: CalendarDays, label: 'Lịch học' },
  { icon: FileText, label: 'Bài tập' },
  { icon: UsersRound, label: 'Nhóm học tập' },
];

const courses = [
  {
    code: '4203002142',
    name: 'Lập trình hướng đối tượng',
    teacher: 'ThS. Nguyễn Minh Khoa',
    progress: 72,
    color: 'bg-brand-600',
    pale: 'bg-brand-50 text-brand-700',
  },
  {
    code: '4203003192',
    name: 'Cơ sở dữ liệu',
    teacher: 'TS. Trần Hoàng Anh',
    progress: 58,
    color: 'bg-violet-500',
    pale: 'bg-violet-50 text-violet-700',
  },
  {
    code: '4203003307',
    name: 'Phát triển ứng dụng Web',
    teacher: 'ThS. Lê Thanh Phúc',
    progress: 84,
    color: 'bg-emerald-500',
    pale: 'bg-emerald-50 text-emerald-700',
  },
];

const schedule = [
  {
    time: '07:00',
    title: 'Lập trình hướng đối tượng',
    room: 'Phòng H5.02',
    tone: 'border-brand-500 bg-brand-50',
  },
  {
    time: '09:30',
    title: 'Cơ sở dữ liệu',
    room: 'Phòng A2.04',
    tone: 'border-violet-500 bg-violet-50',
  },
  {
    time: '13:00',
    title: 'Phát triển ứng dụng Web',
    room: 'Phòng H3.01',
    tone: 'border-emerald-500 bg-emerald-50',
  },
];

function LoadingScreen() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-slate-50"
      aria-live="polite"
    >
      <div className="text-center">
        <LoaderCircle
          className="mx-auto size-8 animate-spin text-brand-600"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-slate-500">
          Đang chuẩn bị không gian học tập...
        </p>
      </div>
    </main>
  );
}

export function StudentDashboardView() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace('/login');
    }
  }

  if (!user) return <LoadingScreen />;

  const firstName = user.fullName.trim().split(/\s+/).at(-1) ?? user.fullName;
  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-ink">
      <header className="fixed inset-x-0 top-0 z-40 flex h-[74px] items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:pl-[278px] lg:pr-8">
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="mr-3 grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="relative hidden w-full max-w-md sm:block">
          <Search
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Tìm kiếm"
            placeholder="Tìm khóa học, tài liệu..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="Thông báo"
          >
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-md shadow-brand-500/20">
              {initials}
            </span>
            <div className="hidden md:block">
              <p className="max-w-40 truncate text-sm font-bold text-ink">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500">Sinh viên</p>
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Đóng menu"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col border-r border-slate-200 bg-white px-4 py-6 transition-transform duration-300 lg:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <BrandLogo />
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-10 space-y-1.5" aria-label="Điều hướng chính">
          {navItems.map(({ icon: Icon, label, active }) => (
            <button
              type="button"
              key={label}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
              {active ? (
                <span className="ml-auto size-1.5 rounded-full bg-brand-600" />
              ) : null}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-slate-100 pt-5">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <CircleHelp className="size-5" /> Trợ giúp
          </button>
          <button
            type="button"
            onClick={() => router.push(getRoleSessionSettings(user.role))}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <Settings className="size-5" /> Cài đặt
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-60"
          >
            {isSigningOut ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <LogOut className="size-5" />
            )}
            {isSigningOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      </aside>

      <main className="min-h-screen px-4 pb-10 pt-[98px] sm:px-6 lg:ml-[258px] lg:px-8">
        <div className="mx-auto max-w-[1250px]">
          <section className="overflow-hidden rounded-[28px] bg-gradient-to-r from-[#164fb7] via-brand-600 to-[#3195f5] px-6 py-7 text-white shadow-lg shadow-brand-800/10 sm:px-9 sm:py-8">
            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-semibold capitalize text-blue-100">
                  {today}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
                  Chào {firstName}, sẵn sàng học chưa?
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  Bạn có 3 tiết học và 2 bài tập sắp đến hạn. Cùng giữ nhịp học
                  tập thật tốt nhé.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="grid size-12 place-items-center rounded-xl bg-white text-brand-700">
                  <TrendingUp className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-100">
                    Chuỗi học tập
                  </p>
                  <p className="mt-0.5 text-xl font-extrabold">12 ngày</p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Thống kê học tập"
          >
            {[
              {
                icon: BookOpen,
                label: 'Khóa học',
                value: '06',
                note: 'Đang tham gia',
                tone: 'bg-brand-50 text-brand-600',
              },
              {
                icon: Clock3,
                label: 'Giờ học',
                value: '24h',
                note: 'Trong tháng này',
                tone: 'bg-violet-50 text-violet-600',
              },
              {
                icon: FileText,
                label: 'Bài tập',
                value: '08',
                note: 'Đã hoàn thành',
                tone: 'bg-amber-50 text-amber-600',
              },
              {
                icon: GraduationCap,
                label: 'Điểm trung bình',
                value: '8.6',
                note: 'Học kỳ hiện tại',
                tone: 'bg-emerald-50 text-emerald-600',
              },
            ].map(({ icon: Icon, label, value, note, tone }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
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
              </div>
            ))}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    Khóa học của tôi
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tiếp tục những gì bạn đang học
                  </p>
                </div>
                <button
                  type="button"
                  className="hidden items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-800 sm:flex"
                >
                  Xem tất cả <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {courses.map((course) => (
                  <article
                    key={course.code}
                    className="group rounded-2xl border border-slate-100 p-4 transition hover:border-brand-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-xl ${course.pale}`}
                      >
                        <BookOpen className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-ink">
                              {course.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {course.code} · {course.teacher}
                            </p>
                          </div>
                          <span className="text-sm font-extrabold text-slate-700">
                            {course.progress}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${course.color}`}
                            style={{ width: `${course.progress}%` }}
                          />
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
                    Lịch hôm nay
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    3 tiết học sắp tới
                  </p>
                </div>
                <CalendarDays className="size-5 text-brand-600" />
              </div>
              <div className="mt-5 space-y-3">
                {schedule.map((item) => (
                  <article
                    key={item.time}
                    className={`rounded-xl border-l-4 p-4 ${item.tone}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-slate-700 shadow-sm">
                        {item.time}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.room}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
