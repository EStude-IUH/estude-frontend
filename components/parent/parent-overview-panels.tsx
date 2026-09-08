"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { parentEngagementService } from "@/lib/engagement-api";
import type { ParentOverview } from "@/types/engagement";

const subjectTones = ["bg-blue-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400"];

export function ParentOverviewPanels() {
  const [overview, setOverview] = useState<ParentOverview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void parentEngagementService.getOverview().then(setOverview).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu tổng quan"));
  }, []);
  if (error) return <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>;
  if (!overview) return <div className="mt-6 grid min-h-36 place-items-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle className="size-7 animate-spin text-brand-600" /></div>;
  return <div className="mt-6 grid gap-5 lg:grid-cols-2">
    <ParentPanel title="Thông báo mới" icon={BellRing} empty="Chưa có thông báo từ giáo viên hoặc nhà trường.">
      {overview.notifications.slice(0, 6).map((item) => <article key={item.id} className="relative border-l-2 border-dashed border-blue-200 pb-5 pl-5 last:border-transparent last:pb-0"><span className={`absolute -left-[7px] top-1 size-3 rounded-full ring-4 ring-white ${item.readAt ? "bg-slate-300" : "bg-brand-500"}`} /><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-extrabold">{item.title}</h3><time className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("vi-VN")}</time></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p><p className="mt-2 text-xs font-semibold text-brand-700">{item.senderName}</p></article>)}
    </ParentPanel>
    <ParentPanel title="Điểm danh của con" icon={Check} empty="Chưa có dữ liệu điểm danh.">
      {overview.attendance.slice(0, 8).map((item) => <article key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><span className={`grid size-10 shrink-0 place-items-center rounded-full ${item.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{item.status === "PRESENT" ? <Check className="size-5" /> : <CircleAlert className="size-5" />}</span><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{item.studentName}</p><p className="text-sm text-slate-500">{item.status === "PRESENT" ? "Có mặt" : "Vắng"} · {new Date(item.sessionDate).toLocaleDateString("vi-VN")}</p></div></article>)}
    </ParentPanel>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarClock className="size-5" /></span><div><h2 className="text-xl font-extrabold">Bài thi sắp tới</h2><p className="text-sm text-slate-500">Lịch của các học sinh đã liên kết</p></div></div>{overview.upcomingExams.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{overview.upcomingExams.map((exam, index) => <article key={exam.id} className="relative overflow-hidden rounded-xl border border-slate-200 p-4 pl-5"><span className={`absolute inset-y-0 left-0 w-1.5 ${subjectTones[index % subjectTones.length]}`} /><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{exam.subjectName} · {exam.className}</p><h3 className="mt-1 font-extrabold">{exam.title}</h3><p className="mt-3 text-sm text-slate-600">{new Date(exam.startsAt).toLocaleString("vi-VN")}</p></article>)}</div> : <Empty text="Chưa có bài thi sắp tới." />}</section>
  </div>;
}

function ParentPanel({ title, icon: Icon, empty, children }: { title: string; icon: typeof BellRing; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-brand-700"><Icon className="size-5" /></span><h2 className="text-xl font-extrabold">{title}</h2></div><div className="mt-5 space-y-3">{items.length && items.some(Boolean) ? children : <Empty text={empty} />}</div></section>;
}

function Empty({ text }: { text: string }) { return <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{text}</p>; }
