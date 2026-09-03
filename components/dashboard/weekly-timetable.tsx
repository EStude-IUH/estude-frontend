"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Video,
} from "lucide-react";

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const timeSlots = ["07:00", "09:30", "13:00", "15:30"];

type TimetableSession = {
  date: string;
  time: string;
  subject: string;
  room: string;
  mode: string;
  tone: string;
};

type WeeklyTimetableProps = {
  sessions?: readonly TimetableSession[];
};

function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12);
}

function normalizeDate(date: Date): Date {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function startOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  return addDays(date, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = createDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

function formatWeekRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} tháng ${end.getMonth() + 1}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.getDate()} tháng ${start.getMonth() + 1} – ${end.getDate()} tháng ${end.getMonth() + 1}, ${end.getFullYear()}`;
  }

  return `${start.getDate()} tháng ${start.getMonth() + 1}, ${start.getFullYear()} – ${end.getDate()} tháng ${end.getMonth() + 1}, ${end.getFullYear()}`;
}

const assignedCourses = [
  { name: "Lập trình hướng đối tượng", code: "DHHTTT18C · OOP", students: 0, tone: "bg-blue-600" },
  { name: "Cơ sở dữ liệu", code: "DHTH19B · CSDL", students: 42, tone: "bg-violet-500" },
  { name: "Phát triển ứng dụng Web", code: "DHKTPM18A · WEB", students: 46, tone: "bg-emerald-500" },
];

export function WeeklyTimetable({ sessions = [] }: WeeklyTimetableProps) {
  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(new Date()));
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () =>
      dayLabels.map((short, index) => {
        const date = addDays(weekStart, index);
        return {
          short,
          date,
          value: toDateValue(date),
          highlighted: toDateValue(date) === toDateValue(selectedDate),
        };
      }),
    [selectedDate, weekStart],
  );
  const weekEnd = weekDays[6].date;

  function selectDate(value: string) {
    const date = parseDateValue(value);
    if (date) setSelectedDate(date);
  }

  return (
    <div className="space-y-5">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-extrabold text-slate-950">Thời khóa biểu tuần</h2>
            <p className="mt-1 text-xs text-slate-500">
              {formatWeekRange(weekStart, weekEnd)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                aria-label="Tuần trước"
                title="Tuần trước"
                onClick={() => setSelectedDate((date) => addDays(date, -7))}
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(normalizeDate(new Date()))}
                className="h-8 rounded-lg px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                Tuần hiện tại
              </button>
              <button
                type="button"
                aria-label="Tuần sau"
                title="Tuần sau"
                onClick={() => setSelectedDate((date) => addDays(date, 7))}
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
              <CalendarDays className="size-4 shrink-0" />
              <span className="sr-only">Chọn ngày thuộc tuần cần xem</span>
              <input
                type="date"
                value={toDateValue(selectedDate)}
                onChange={(event) => selectDate(event.target.value)}
                aria-label="Chọn ngày thuộc tuần cần xem"
                className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              />
            </label>

            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
              Học kỳ 1 · 2026–2027
            </span>
          </div>
        </header>

        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div className="grid grid-cols-[74px_repeat(7,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/70">
              <div />
              {weekDays.map((day) => (
                <div key={day.value} className={`border-l border-slate-100 px-3 py-3 text-center ${day.highlighted ? "bg-blue-50" : ""}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{day.short}</p>
                  <p className={`mt-0.5 text-lg font-extrabold ${day.highlighted ? "text-brand-700" : "text-slate-800"}`}>{day.date.getDate()}</p>
                </div>
              ))}
            </div>

            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-[74px_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0">
                <div className="px-3 py-4 text-center text-xs font-bold text-slate-400">{time}</div>
                {weekDays.map((day) => {
                  const session = sessions.find((item) => item.date === day.value && item.time === time);
                  return (
                    <div key={`${day.value}-${time}`} className={`min-h-[106px] border-l border-slate-100 p-2 ${day.highlighted ? "bg-blue-50/30" : ""}`}>
                      {session ? (
                        <article className={`h-full rounded-xl border p-3 ${session.tone}`}>
                          <p className="line-clamp-2 text-xs font-extrabold leading-4">{session.subject}</p>
                          <div className="mt-2 flex items-center gap-1 text-[11px] opacity-75">
                            {session.mode === "Trực tuyến" ? <Video className="size-3" /> : <MapPin className="size-3" />}
                            {session.room}
                          </div>
                          <p className="mt-1 text-[10px] font-semibold opacity-65">{session.mode}</p>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold">Môn học được phân công</h2>
            <p className="mt-1 text-xs text-slate-500">Các lớp và môn học đang phụ trách trong học kỳ</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
            {assignedCourses.length} môn học
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {assignedCourses.map((course) => (
            <article key={course.code} className="rounded-2xl border border-slate-100 p-4 transition hover:border-brand-200 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${course.tone}`}>
                  <BookOpenCheck className="size-5" />
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Đang phụ trách</span>
              </div>
              <h3 className="mt-3 truncate text-sm font-extrabold text-slate-900">{course.name}</h3>
              <p className="mt-1 truncate text-xs font-semibold text-brand-600">{course.code}</p>
              <p className="mt-3 text-xs text-slate-500">{course.students} học viên</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
