"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Check, CircleAlert, LoaderCircle, Save, Send, UsersRound } from "lucide-react";
import { AssessmentShell, ErrorPanel, PageHeading } from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
import { attendanceService, notificationService } from "@/lib/engagement-api";
import { getVietnameseSubjectName } from "@/lib/subject-localization";
import type { TeacherAssignedClass } from "@/types/assessment";
import type { AttendanceRoster, AttendanceStatus } from "@/types/engagement";

export function TeacherEngagementCenter({ initialTab = "attendance" }: { initialTab?: "attendance" | "message" }) {
  const { notify } = useActionNotification();
  const [tab, setTab] = useState(initialTab);
  const [classes, setClasses] = useState<TeacherAssignedClass[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<AttendanceRoster | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<"STUDENTS" | "PARENTS">("STUDENTS");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [composerError, setComposerError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedClass = classes.find((item) => item.id === classId);
  const subjects = selectedClass?.subjects ?? [];

  useEffect(() => {
    void academicDataService.getTeacherAssignedClasses()
      .then((items) => {
        setClasses(items);
        const firstClass = items[0];
        setClassId(firstClass?.id ?? "");
        setSubjectId(firstClass?.subjects[0]?.id ?? "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải lớp được phân công"))
      .finally(() => setLoading(false));
  }, []);

  const loadRoster = useCallback(async () => {
    if (!classId || !subjectId) {
      setRoster(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await attendanceService.getClassRoster(classId, subjectId, date);
      setRoster(result);
      setStatuses(Object.fromEntries(result.students.map((student) => [student.id, student.attendance?.status ?? "PRESENT"])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải danh sách điểm danh");
    } finally {
      setLoading(false);
    }
  }, [classId, date, subjectId]);

  useEffect(() => { if (tab === "attendance") void loadRoster(); }, [loadRoster, tab]);

  function chooseClass(value: string) {
    const nextClass = classes.find((item) => item.id === value);
    setClassId(value);
    setSubjectId(nextClass?.subjects[0]?.id ?? "");
  }

  function toggleStudent(studentId: string) {
    setStatuses((current) => ({ ...current, [studentId]: current[studentId] === "ABSENT" ? "PRESENT" : "ABSENT" }));
  }

  async function saveAttendance() {
    if (!roster) return;
    setSyncing(true);
    try {
      await attendanceService.saveClassRoster(classId, subjectId, date, roster.students.map((student) => ({ studentId: student.id, status: statuses[student.id] ?? "PRESENT" })));
      notify("Đã đồng bộ điểm danh", { key: "attendance-saved" });
      await loadRoster();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Không thể lưu điểm danh", { key: "attendance-error", variant: "error" });
    } finally {
      setSyncing(false);
    }
  }

  function validateComposer() {
    if (!classId || !subjectId) return "Vui lòng chọn lớp và môn học.";
    if (!title.trim()) return "Vui lòng nhập tiêu đề.";
    if (!message.trim()) return "Vui lòng nhập nội dung thông báo.";
    return "";
  }

  async function sendNotification() {
    setConfirming(false);
    setSending(true);
    try {
      const result = await notificationService.sendClass({ classId, subjectId, audience, title: title.trim(), message: message.trim() });
      notify(`Đã gửi đến ${result.recipientCount} người nhận`, { key: "class-notification-sent" });
      setTitle("");
      setMessage("");
    } catch (cause) {
      setComposerError(cause instanceof Error ? cause.message : "Không thể gửi thông báo");
    } finally {
      setSending(false);
    }
  }

  const summary = useMemo(() => {
    const values = Object.values(statuses);
    return { present: values.filter((value) => value === "PRESENT").length, absent: values.filter((value) => value === "ABSENT").length };
  }, [statuses]);

  return (
    <AssessmentShell>
      <PageHeading eyebrow="Class operations" title="Điểm danh & thông báo" description="Thao tác nhanh cho lớp học trên mọi kích thước màn hình." />
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Công cụ lớp học">
        <Button variant={tab === "attendance" ? "primary" : "outline"} onClick={() => setTab("attendance")}><Check className="size-4" /> Điểm danh</Button>
        <Button variant={tab === "message" ? "primary" : "outline"} onClick={() => setTab("message")}><BellRing className="size-4" /> Gửi thông báo</Button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Lớp học" value={classId} onChange={(event) => chooseClass(event.target.value)}>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
          </Select>
          <Select label="Môn học" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {subjects.map((item) => <option key={item.id} value={item.id}>{getVietnameseSubjectName(item)}</option>)}
          </Select>
          {tab === "attendance" ? <Input label="Ngày học" type="date" value={date} onChange={(event) => setDate(event.target.value)} /> : null}
        </div>
      </section>

      {tab === "attendance" ? (
        <section className="mt-5">
          {error ? <ErrorPanel message={error} /> : null}
          {loading ? <div className="grid min-h-52 place-items-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle className="size-7 animate-spin text-brand-600" /></div> : null}
          {!loading && !error && roster && !roster.students.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><UsersRound className="mx-auto size-8 text-slate-300" /><h2 className="mt-3 font-extrabold">Lớp chưa có học sinh</h2><p className="mt-1 text-sm text-slate-500">Hãy thêm học sinh vào lớp trước khi điểm danh.</p></div> : null}
          {!loading && roster?.students.length ? <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-sm font-bold"><span className="text-emerald-300">{summary.present} có mặt</span> · <span className="text-rose-300">{summary.absent} vắng</span></p>
              <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setStatuses(Object.fromEntries(roster.students.map((student) => [student.id, "PRESENT"])))}>Tất cả có mặt</Button><Button size="sm" disabled={syncing} onClick={() => void saveAttendance()}>{syncing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} {syncing ? "Đang lưu" : "Lưu điểm danh"}</Button></div>
            </div>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Học sinh</th><th className="px-5 py-3">Mã học sinh</th><th className="px-5 py-3 text-right">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{roster.students.map((student) => <tr key={student.id}><td className="px-5 py-3 font-bold">{student.fullName}</td><td className="px-5 py-3 text-sm text-slate-500">{student.accountName}</td><td className="px-5 py-3 text-right"><AttendanceToggle value={statuses[student.id]} onClick={() => toggleStudent(student.id)} /></td></tr>)}</tbody></table>
            </div>
            <div className="grid gap-3 md:hidden">{roster.students.map((student) => <article key={student.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${statuses[student.id] === "PRESENT" ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}><span className="relative grid size-11 shrink-0 overflow-hidden place-items-center rounded-full bg-white font-black text-brand-700">{student.avatarUrl ? <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${student.avatarUrl})` }} /> : student.fullName.charAt(0)}</span><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{student.fullName}</p><p className="text-xs text-slate-500">{student.accountName} · {statuses[student.id] === "PRESENT" ? "Có mặt" : "Vắng"}</p></div><AttendanceToggle value={statuses[student.id]} onClick={() => toggleStudent(student.id)} compact /></article>)}</div>
          </> : null}
        </section>
      ) : (
        <section className="mx-auto mt-5 max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
          <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-700"><Send className="size-5" /></span><div><h2 className="text-lg font-extrabold">Soạn thông báo</h2><p className="mt-1 text-sm text-slate-500">Gửi đúng nhóm người nhận thuộc lớp bạn phụ trách.</p></div></div>
          <div className="mt-6 space-y-5">
            <Select label="Người nhận" value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}><option value="STUDENTS">Học sinh trong lớp</option><option value="PARENTS">Phụ huynh trong lớp</option></Select>
            <Input label="Tiêu đề" maxLength={160} value={title} onChange={(event) => { setTitle(event.target.value); setComposerError(""); }} placeholder="Ví dụ: Nhắc lịch kiểm tra giữa kỳ" />
            <Textarea label="Nội dung" rows={7} maxLength={5000} value={message} onChange={(event) => { setMessage(event.target.value); setComposerError(""); }} placeholder="Nhập nội dung ngắn gọn, rõ ràng..." />
            {composerError ? <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><CircleAlert className="size-4" /> {composerError}</p> : null}
            <Button className="w-full sm:w-auto" disabled={sending} onClick={() => { const validation = validateComposer(); setComposerError(validation); if (!validation) setConfirming(true); }}>{sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} {sending ? "Đang gửi..." : "Gửi thông báo"}</Button>
          </div>
        </section>
      )}

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Xác nhận gửi thông báo" description={`Thông báo sẽ được gửi đến ${audience === "STUDENTS" ? "học sinh" : "phụ huynh"} của ${selectedClass?.name ?? "lớp đã chọn"}.`} footer={<><Button variant="outline" onClick={() => setConfirming(false)}>Kiểm tra lại</Button><Button onClick={() => void sendNotification()}><Send className="size-4" /> Xác nhận gửi</Button></>}><div className="rounded-xl bg-slate-50 p-4"><p className="font-extrabold">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{message}</p></div></Modal>
    </AssessmentShell>
  );
}

function AttendanceToggle({ value, onClick, compact = false }: { value?: AttendanceStatus; onClick: () => void; compact?: boolean }) {
  const present = value !== "ABSENT";
  return <button type="button" onClick={onClick} aria-pressed={present} aria-label={present ? "Đang có mặt, nhấn để đánh dấu vắng" : "Đang vắng, nhấn để đánh dấu có mặt"} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border font-extrabold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${compact ? "size-11 px-0" : "px-4"} ${present ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-rose-300 bg-rose-100 text-rose-800"}`}><span className="grid size-6 place-items-center rounded-full bg-white">{present ? <Check className="size-4" /> : <CircleAlert className="size-4" />}</span>{compact ? null : present ? "Có mặt" : "Vắng"}</button>;
}
