"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  Link2,
  LoaderCircle,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ProfileModal } from "@/components/auth/profile-modal";
import { useAuth } from "@/context/auth-context";
import { getRoleSessionSettings } from "@/lib/role-routes";
import { authenticatedRequest } from "@/lib/auth-api";
import type { User } from "@/types/auth";

export function ParentDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [children, setChildren] = useState<User[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState("");

  useEffect(() => {
    let active = true;
    authenticatedRequest<User[]>("/users/me/children")
      .then((result) => {
        if (active) setChildren(result);
      })
      .catch((error: unknown) => {
        if (active) setChildrenError(error instanceof Error ? error.message : "Không thể tải danh sách học sinh.");
      })
      .finally(() => {
        if (active) setLoadingChildren(false);
      });
    return () => { active = false; };
  }, []);

  if (!user) return null;

  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <BrandLogo withShadow={false} />
          <span className="ml-4 hidden border-l border-slate-200 pl-4 text-sm font-bold text-slate-500 sm:block">
            Cổng phụ huynh
          </span>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((current) => !current)}
              className="flex items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="relative grid size-10 overflow-hidden place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-sm font-extrabold text-white">
                {user.avatarUrl ? (
                  <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${user.avatarUrl})` }} />
                ) : initials}
              </span>
              <span className="hidden sm:block">
                <span className="block max-w-44 truncate text-sm font-bold">{user.fullName}</span>
                <span className="block text-xs font-semibold text-brand-600">Phụ huynh</span>
              </span>
              <ChevronDown className={`size-4 text-slate-400 transition ${accountMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {accountMenuOpen ? (
              <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); setProfileOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <UserRound className="size-4" /> Hồ sơ cá nhân
                </button>
                <button type="button" role="menuitem" onClick={() => router.push(getRoleSessionSettings(user.role))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <Settings className="size-4" /> Phiên đăng nhập
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button type="button" role="menuitem" disabled={signingOut} onClick={() => void handleSignOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                  {signingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-800 p-6 text-white shadow-xl sm:p-9">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                <HeartHandshake className="size-4" /> Đồng hành cùng con
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Xin chào, {user.fullName}
              </h1>
              <p className="mt-3 leading-7 text-blue-100">
                Theo dõi kết quả học tập, lịch kiểm tra và những thông báo quan trọng từ nhà trường tại một nơi.
              </p>
            </div>
            <span className="grid size-24 shrink-0 place-items-center rounded-3xl border border-white/15 bg-white/10 text-cyan-200">
              <GraduationCap className="size-12" />
            </span>
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { icon: BookOpenCheck, title: "Kết quả học tập", detail: "Điểm số và tiến độ học tập của học sinh sẽ hiển thị tại đây." },
            { icon: Bell, title: "Thông báo", detail: "Nhận thông tin mới từ giáo viên và nhà trường." },
            { icon: ShieldCheck, title: "Theo dõi an toàn", detail: "Chỉ dữ liệu của học sinh đã được xác nhận liên kết mới được hiển thị." },
          ].map(({ icon: Icon, title, detail }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-brand-700"><Icon className="size-5" /></span>
              <h2 className="mt-4 font-extrabold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Link2 className="size-5" /></span>
            <div>
              <h2 className="text-lg font-extrabold">Học sinh đã liên kết</h2>
              <p className="text-sm text-slate-500">Các hồ sơ học sinh mà nhà trường đã xác nhận.</p>
            </div>
          </div>

          {loadingChildren ? (
            <div className="grid min-h-36 place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-600" /></div>
          ) : childrenError ? (
            <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{childrenError}</p>
          ) : children.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((student) => (
                <article key={student.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                  <span className="relative grid size-11 shrink-0 overflow-hidden place-items-center rounded-xl bg-blue-100 font-extrabold text-brand-700">
                    {student.avatarUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${student.avatarUrl})` }} /> : student.fullName.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{student.fullName}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {student.assignedClass ? `${student.assignedClass.code} · ${student.assignedClass.name}` : `Mã HS: ${student.accountName}`}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <h3 className="font-extrabold">Chưa có học sinh được liên kết</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Vui lòng liên hệ nhà trường để xác nhận và liên kết tài khoản phụ huynh với hồ sơ học sinh.</p>
            </div>
          )}
        </section>
      </main>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
