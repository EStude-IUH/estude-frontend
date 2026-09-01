"use client";

import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Video,
} from "lucide-react";
import { StudentShell } from "@/components/student/student-shell";

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

export function StudentDashboardView() {
  const router = useRouter();

  return (
    <StudentShell>
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
                onClick={() => router.push("/student/courses")}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                Vào môn học để làm bài <ChevronRight className="size-4" />
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
    </StudentShell>
  );
}
