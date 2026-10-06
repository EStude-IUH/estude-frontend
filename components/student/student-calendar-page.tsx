"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FileText, LoaderCircle } from 'lucide-react';
import { StudentShell } from '@/components/student/student-shell';
import { calendarService } from '@/lib/calendar-api';
import type { CalendarEvent, CalendarResponse } from '@/types/calendar';

const defaultZone = process.env.NEXT_PUBLIC_CALENDAR_TIME_ZONE || 'Asia/Ho_Chi_Minh';
const labels: Record<string, string> = {
  UPCOMING: 'Sắp mở', OPEN: 'Đang mở', OVERDUE: 'Quá hạn · còn nhận nộp',
  CLOSED: 'Đã khóa', SUBMITTED: 'Đã nộp', EXCUSED: 'Được miễn',
  IN_PROGRESS: 'Đang làm', FINALIZED: 'Đã hoàn tất', ENDED: 'Đã kết thúc',
};

function dayKey(value: Date, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function monthBounds(month: string) {
  const [year, value] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}`, last };
}
function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}
function spansDay(event: CalendarEvent, day: string, zone: string) {
  const start = dayKey(new Date(event.startAt), zone);
  const end = event.endAt ? dayKey(new Date(new Date(event.endAt).getTime() - 1), zone) : start;
  return start <= day && day <= end;
}
function displayTime(value: string, zone: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: zone, day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function StudentCalendarPage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => dayKey(new Date(), defaultZone).slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date(), defaultZone));
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bounds = useMemo(() => monthBounds(month), [month]);
  const zone = data?.timeZone ?? defaultZone;
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void calendarService.month(bounds.from, bounds.to).then((result) => {
      if (active) setData(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không tải được lịch học tập');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bounds.from, bounds.to]);
  const firstWeekday = (new Date(`${bounds.from}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  const days = Array.from({ length: bounds.last }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, '0')}`);
  const daily = (data?.events ?? []).filter((event) => spansDay(event, selectedDay, zone));
  function navigateMonth(offset: number) {
    const next = shiftMonth(month, offset);
    setMonth(next); setSelectedDay(`${next}-01`);
  }
  return <StudentShell><main className="space-y-5 p-4 sm:p-6">
    <div><p className="text-sm font-semibold text-brand-700">Calendar</p><h1 className="text-2xl font-black">Lịch học tập</h1>
      <p className="mt-1 text-sm text-slate-500">Hạn bài tập và cửa sổ bài kiểm tra của bạn · múi giờ {zone}.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-extrabold">Tháng {month.slice(5)}/{month.slice(0, 4)}</h2>
        <div className="flex items-center gap-2"><button aria-label="Tháng trước" onClick={() => navigateMonth(-1)} className="rounded-lg border p-2"><ChevronLeft className="size-4" /></button>
          <input aria-label="Chọn tháng" type="month" value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) {
            setMonth(event.target.value); setSelectedDay(`${event.target.value}-01`);
          } }} className="rounded-lg border px-2 py-1.5 text-sm" />
          <button aria-label="Tháng sau" onClick={() => navigateMonth(1)} className="rounded-lg border p-2"><ChevronRight className="size-4" /></button></div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
        {days.map((day) => { const count = (data?.events ?? []).filter((event) => spansDay(event, day, zone)).length;
          return <button key={day} onClick={() => setSelectedDay(day)} aria-label={`${day}, ${count} mục`}
            aria-pressed={selectedDay === day} className={`min-h-14 rounded-lg border p-1 text-sm ${selectedDay === day ? 'border-brand-600 bg-blue-50 text-brand-800' : 'border-slate-100 hover:bg-slate-50'}`}>
            <span className="block font-bold">{Number(day.slice(-2))}</span>{count ? <span className="mt-1 inline-block rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{count}</span> : null}</button>; })}</div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-brand-700" /><h2 className="font-extrabold">{selectedDay.split('-').reverse().join('/')}</h2></div>
      {loading ? <p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="size-4 animate-spin" />Đang tải lịch...</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : null}
      {!loading && !error && !daily.length ? <p className="mt-4 text-sm text-slate-500">Ngày này không có hạn bài tập hoặc bài kiểm tra.</p> : null}
      {!loading && !error ? <div className="mt-4 space-y-2">{daily.map((event) => <button key={`${event.type}:${event.sourceId}`} onClick={() => router.push(event.sourceUrl)} className="flex w-full gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-brand-400 hover:bg-blue-50/30">
        {event.type === 'EXAM' ? <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-violet-600" /> : <FileText className="mt-0.5 size-5 shrink-0 text-amber-600" />}
        <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-500">{event.subject.name} · {event.schoolClass.code} · {event.type === 'EXAM' ? 'Bài kiểm tra' : 'Hạn bài tập'}</span>
          <span className="mt-1 block font-bold">{event.title}</span><span className="mt-1 block text-xs text-slate-600">{event.type === 'EXAM' && event.endAt ? `${displayTime(event.startAt, zone)} – ${displayTime(event.endAt, zone)}` : displayTime(event.startAt, zone)} · {labels[event.status] ?? event.status}</span>
          {event.hasPersonalSchedule ? <span className="mt-1 block text-xs font-semibold text-brand-700">Lịch riêng giáo viên đã cấp cho bạn</span> : null}
          {event.historyOnly ? <span className="mt-1 block text-xs text-amber-700">Chỉ xem lịch sử{event.canResume ? ' hoặc tiếp tục lượt đang làm' : ''}; không mở lượt mới.</span> : null}
          <span className="mt-1 block text-xs text-slate-500">{event.canResume ? 'Tiếp tục bài đang làm' : event.canStart ? 'Có thể mở lượt làm bài mới' : event.canSubmit ? 'Còn nhận bài nộp' : 'Xem chi tiết và lịch sử'}</span>
          {event.status === 'UPCOMING' && event.availableFrom ? <span className="mt-1 block text-xs text-amber-700">Mở từ {displayTime(event.availableFrom, zone)}</span> : null}</span><ChevronRight className="size-4 shrink-0 text-slate-400" /></button>)}</div> : null}
    </section>
  </main></StudentShell>;
}
