"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flag,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { examAttemptService, examService } from "@/lib/assessment-api";
import {
  QUESTION_TYPE_LABELS,
  type Exam,
  type ExamAnswer,
  type ExamAttempt,
  type StudentExamStatus,
} from "@/types/assessment";

type StudentExamFilter = "ALL" | "UPCOMING" | "OPEN" | "SUBMITTED" | "ENDED";

const statusMeta: Record<StudentExamStatus, { label: string; tone: string }> = {
  UPCOMING: { label: "Sắp diễn ra", tone: "bg-amber-50 text-amber-700" },
  AVAILABLE: { label: "Đang mở", tone: "bg-emerald-50 text-emerald-700" },
  IN_PROGRESS: { label: "Đang làm", tone: "bg-blue-50 text-blue-700" },
  SUBMITTED: { label: "Đã nộp", tone: "bg-violet-50 text-violet-700" },
  ENDED: { label: "Đã kết thúc", tone: "bg-slate-100 text-slate-600" },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

function getStudentStatus(exam: Exam): StudentExamStatus {
  if (exam.studentStatus) return exam.studentStatus;
  if (exam.status === "SCHEDULED") return "UPCOMING";
  if (exam.status === "ONGOING") return "AVAILABLE";
  return "ENDED";
}

function matchesFilter(status: StudentExamStatus, filter: StudentExamFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "OPEN") return status === "AVAILABLE" || status === "IN_PROGRESS";
  return status === filter;
}

export function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [filter, setFilter] = useState<StudentExamFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState("");

  useEffect(() => {
    void examService.getExams()
      .then(setExams)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bài kiểm tra"))
      .finally(() => setLoading(false));
  }, []);

  async function start(exam: Exam) {
    setStarting(exam.id);
    setError("");
    try {
      const attempt = await examAttemptService.startExam(exam.id);
      router.push(`/student/attempts/${attempt.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể bắt đầu bài kiểm tra");
    } finally {
      setStarting("");
    }
  }

  function performPrimaryAction(exam: Exam) {
    const status = getStudentStatus(exam);
    if (status === "IN_PROGRESS" && exam.currentAttempt) {
      router.push(`/student/attempts/${exam.currentAttempt.id}`);
      return;
    }
    if (status === "SUBMITTED" && exam.currentAttempt && !exam.canStart) {
      router.push(`/student/attempts/${exam.currentAttempt.id}/result`);
      return;
    }
    if (status === "AVAILABLE" || exam.canStart) {
      void start(exam);
      return;
    }
    router.push(`/student/exams/${exam.id}`);
  }

  const visibleExams = exams.filter((exam) => matchesFilter(getStudentStatus(exam), filter));
  const filters: Array<{ value: StudentExamFilter; label: string }> = [
    { value: "ALL", label: "Tất cả" },
    { value: "UPCOMING", label: "Sắp diễn ra" },
    { value: "OPEN", label: "Đang mở" },
    { value: "SUBMITTED", label: "Đã hoàn thành" },
    { value: "ENDED", label: "Đã kết thúc" },
  ];

  return (
    <AssessmentShell student>
      <PageHeading
        eyebrow="Student workspace"
        title="Bài kiểm tra của tôi"
        description="Các bài kiểm tra được giáo viên giao cho lớp bạn đang tham gia."
      />
      {error ? <div className="mb-5"><ErrorPanel message={error} /></div> : null}
      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
        {filters.map((item) => (
          <Button key={item.value} size="sm" variant={filter === item.value ? "primary" : "ghost"} onClick={() => setFilter(item.value)}>
            {item.label}
          </Button>
        ))}
      </div>
      {loading ? <LoadingPanel /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleExams.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm text-slate-500">
              Không có bài kiểm tra trong nhóm trạng thái này.
            </div>
          ) : visibleExams.map((exam) => {
            const status = getStudentStatus(exam);
            const meta = statusMeta[status];
            const primaryLabel = status === "IN_PROGRESS"
              ? "Tiếp tục làm bài"
              : status === "SUBMITTED" && !exam.canStart
                ? "Xem kết quả"
                : exam.canStart && status === "SUBMITTED"
                  ? "Làm lại"
                  : status === "AVAILABLE"
                    ? "Bắt đầu làm bài"
                    : "Xem chi tiết";
            return (
              <article key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${meta.tone}`}>{meta.label}</span>
                    <h2 className="mt-3 text-lg font-black">{exam.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{exam.subjectName} · {exam.className} · Giáo viên {exam.teacherName ?? "phụ trách môn"}</p>
                  </div>
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Clock3 className="size-5" /></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-sm">
                  <div><p className="text-xs text-slate-400">Câu hỏi</p><p className="mt-1 font-extrabold">{exam.questions.length} câu</p></div>
                  <div><p className="text-xs text-slate-400">Thời lượng</p><p className="mt-1 font-extrabold">{exam.settings.durationMinutes} phút</p></div>
                  <div className="col-span-2"><p className="text-xs text-slate-400">Thời gian mở</p><p className="mt-1 font-semibold">{formatDate(exam.settings.startsAt)} – {formatDate(exam.settings.endsAt)}</p></div>
                  <div className="col-span-2"><p className="text-xs text-slate-400">Số lượt</p><p className="mt-1 font-semibold">Đã dùng {exam.attemptsUsed ?? 0}/{exam.settings.attemptsAllowed} lượt</p></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => router.push(`/student/exams/${exam.id}`)}><Eye className="size-4" /> Xem chi tiết</Button>
                  <Button className="flex-1" disabled={starting === exam.id || (status === "ENDED" && !exam.currentAttempt)} onClick={() => performPrimaryAction(exam)}>
                    {status === "IN_PROGRESS" ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
                    {starting === exam.id ? "Đang mở bài..." : primaryLabel}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AssessmentShell>
  );
}

export function StudentExamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void examService.getExamById(params.id)
      .then(setExam)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bài kiểm tra"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function start() {
    if (!exam) return;
    setStarting(true);
    setError("");
    try {
      const attempt = await examAttemptService.startExam(exam.id);
      router.push(`/student/attempts/${attempt.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể bắt đầu bài kiểm tra");
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <AssessmentShell student><LoadingPanel /></AssessmentShell>;
  if (error && !exam) return <AssessmentShell student><ErrorPanel message={error} /></AssessmentShell>;
  if (!exam) return null;

  const status = getStudentStatus(exam);
  const meta = statusMeta[status];
  const currentAttempt = exam.currentAttempt;

  return (
    <AssessmentShell student>
      <PageHeading eyebrow="Exam overview" title={exam.title} description={`${exam.subjectName} · ${exam.className}`} action={<Button variant="ghost" onClick={() => router.push("/student/exams")}><ArrowLeft className="size-4" /> Danh sách bài</Button>} />
      {error ? <div className="mb-5"><ErrorPanel message={error} /></div> : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${meta.tone}`}>{meta.label}</span>
          <h2 className="mt-5 text-xl font-black">Thông tin bài kiểm tra</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{exam.description || "Giáo viên không cung cấp mô tả cho bài kiểm tra này."}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Môn học</p><p className="mt-1 font-black">{exam.subjectName}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Giáo viên</p><p className="mt-1 font-black">{exam.teacherName ?? "Giáo viên phụ trách"}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Số câu hỏi</p><p className="mt-1 font-black">{exam.questions.length} câu</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Tổng điểm</p><p className="mt-1 font-black">{exam.totalPoints} điểm</p></div>
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3"><CalendarClock className="size-5 text-brand-600" /><h2 className="font-black">Thời gian làm bài</h2></div>
          <dl className="mt-5 space-y-4 text-sm">
            <div><dt className="text-xs text-slate-400">Bắt đầu</dt><dd className="mt-1 font-bold">{formatDate(exam.settings.startsAt)}</dd></div>
            <div><dt className="text-xs text-slate-400">Kết thúc</dt><dd className="mt-1 font-bold">{formatDate(exam.settings.endsAt)}</dd></div>
            <div><dt className="text-xs text-slate-400">Thời lượng</dt><dd className="mt-1 font-bold">{exam.settings.durationMinutes} phút</dd></div>
            <div><dt className="text-xs text-slate-400">Số lần được phép</dt><dd className="mt-1 font-bold">{exam.settings.attemptsAllowed} lần · còn {exam.attemptsRemaining ?? exam.settings.attemptsAllowed} lần</dd></div>
          </dl>
          {status === "IN_PROGRESS" && currentAttempt ? <Button className="mt-6 w-full" onClick={() => router.push(`/student/attempts/${currentAttempt.id}`)}><RotateCcw className="size-4" /> Tiếp tục làm bài</Button> : null}
          {status === "SUBMITTED" && currentAttempt ? <Button className="mt-6 w-full" variant={exam.canStart ? "outline" : "primary"} onClick={() => router.push(`/student/attempts/${currentAttempt.id}/result`)}><Eye className="size-4" /> Xem kết quả</Button> : null}
          {(status === "AVAILABLE" || exam.canStart) ? <Button className="mt-2 w-full" disabled={starting} onClick={() => void start()}><Play className="size-4" /> {starting ? "Đang bắt đầu..." : exam.attemptsUsed ? "Bắt đầu lượt mới" : "Bắt đầu làm bài"}</Button> : null}
          {status === "UPCOMING" ? <Button className="mt-6 w-full" disabled>Chưa đến thời gian mở bài</Button> : null}
          {status === "ENDED" ? <Button className="mt-6 w-full" disabled>Bài kiểm tra đã kết thúc</Button> : null}
        </aside>
      </div>
    </AssessmentShell>
  );
}

export function StudentAttemptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<(ExamAttempt & { exam: Exam }) | null>(null);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingEssayRef = useRef<ExamAnswer | null>(null);
  const essayTimerRef = useRef<number | null>(null);
  const autoSubmitStartedRef = useRef(false);

  useEffect(() => {
    void examAttemptService.getAttempt(params.id)
      .then((loaded) => {
        if (loaded.status === "SUBMITTED") {
          router.replace(`/student/attempts/${params.id}/result`);
          return;
        }
        if (!loaded.expiresAt) throw new Error("Máy chủ không trả về thời gian hết hạn bài làm");
        setAttempt(loaded);
        setAnswers(Object.fromEntries(loaded.answers.map((answer) => [answer.questionId, answer])));
        setSecondsLeft(Math.max(0, Math.ceil((new Date(loaded.expiresAt).getTime() - Date.now()) / 1000)));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bài làm"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    if (!attempt?.expiresAt || attempt.status !== "IN_PROGRESS") return;
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(attempt.expiresAt!).getTime() - Date.now()) / 1000)));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  useEffect(() => {
    const flushOnPageHide = () => {
      const pending = pendingEssayRef.current;
      if (!pending) return;
      pendingEssayRef.current = null;
      void examAttemptService.saveAnswer(params.id, pending, true).catch(() => undefined);
    };
    window.addEventListener("pagehide", flushOnPageHide);
    return () => window.removeEventListener("pagehide", flushOnPageHide);
  }, [params.id]);

  // Server-backed expiration is the trigger; submit remains protected by backend timing checks.
  useEffect(() => {
    if (!attempt || secondsLeft !== 0 || autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    void submit(true);
  }, [attempt, secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedQuestions = useMemo(() => attempt ? [...attempt.exam.questions].sort((left, right) => left.order - right.order) : [], [attempt]);
  const currentQuestion = orderedQuestions[index];
  const expired = secondsLeft === 0;

  function currentAnswer(questionId: string): ExamAnswer {
    return answers[questionId] ?? { questionId, selectedOptionIds: [], essayText: "", flagged: false };
  }

  function persistAnswer(answer: ExamAnswer): Promise<void> {
    setAnswers((current) => ({ ...current, [answer.questionId]: answer }));
    setSaving(true);
    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      await examAttemptService.saveAnswer(params.id, answer);
    });
    saveQueueRef.current = operation;
    void operation.catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể lưu câu trả lời")).finally(() => {
      if (saveQueueRef.current === operation) setSaving(false);
    });
    return operation;
  }

  function scheduleEssaySave(answer: ExamAnswer) {
    setAnswers((current) => ({ ...current, [answer.questionId]: answer }));
    pendingEssayRef.current = answer;
    if (essayTimerRef.current) window.clearTimeout(essayTimerRef.current);
    essayTimerRef.current = window.setTimeout(() => {
      const pending = pendingEssayRef.current;
      pendingEssayRef.current = null;
      essayTimerRef.current = null;
      if (pending) void persistAnswer(pending);
    }, 500);
  }

  function flushPendingEssay(): Promise<void> {
    if (essayTimerRef.current) window.clearTimeout(essayTimerRef.current);
    essayTimerRef.current = null;
    const pending = pendingEssayRef.current;
    pendingEssayRef.current = null;
    return pending ? persistAnswer(pending) : saveQueueRef.current;
  }

  function setChoice(optionId: string) {
    if (!currentQuestion || expired) return;
    const answer = currentAnswer(currentQuestion.questionId);
    const isMultiple = currentQuestion.question?.type === "MULTIPLE_CHOICE";
    const selectedOptionIds = isMultiple
      ? answer.selectedOptionIds.includes(optionId)
        ? answer.selectedOptionIds.filter((id) => id !== optionId)
        : [...answer.selectedOptionIds, optionId]
      : answer.selectedOptionIds.includes(optionId) ? [] : [optionId];
    void persistAnswer({ ...answer, selectedOptionIds });
  }

  async function submit(auto = false) {
    if (!attempt || attempt.status === "SUBMITTED" || submitting) return;
    if (!auto && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setSubmitting(true);
    setError("");
    try {
      if (auto) {
        if (essayTimerRef.current) window.clearTimeout(essayTimerRef.current);
        essayTimerRef.current = null;
        pendingEssayRef.current = null;
        await saveQueueRef.current.catch(() => undefined);
      } else {
        await flushPendingEssay();
        await saveQueueRef.current;
      }
      await examAttemptService.submitExam(params.id);
      router.replace(`/student/attempts/${params.id}/result`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể nộp bài");
      setSubmitting(false);
    }
  }

  if (loading) return <AssessmentShell student><LoadingPanel /></AssessmentShell>;
  if (error && !attempt) return <AssessmentShell student><ErrorPanel message={error} /></AssessmentShell>;
  if (!attempt || !currentQuestion || secondsLeft === null) return null;

  const answer = currentAnswer(currentQuestion.questionId);
  const answeredCount = Object.values(answers).filter((item) => item.selectedOptionIds.length > 0 || item.essayText.trim()).length;
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <AssessmentShell student>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">Đang làm bài</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{attempt.exam.title}</h1></div>
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-black ${secondsLeft < 300 ? "bg-rose-50 text-rose-700" : "bg-slate-950 text-white"}`}><Clock3 className="size-5" />{minutes}:{seconds}</div>
      </div>
      {error ? <div className="mb-4"><ErrorPanel message={error} /></div> : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
          <div className="flex items-center justify-between text-sm">
            <span className="font-black text-brand-700">Câu {index + 1} / {orderedQuestions.length}</span>
            <button type="button" disabled={expired} onClick={() => void persistAnswer({ ...answer, flagged: !answer.flagged })} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${answer.flagged ? "bg-amber-50 text-amber-700" : "text-slate-400 hover:bg-slate-50"}`}><Flag className="size-4" />{answer.flagged ? "Đã đánh dấu" : "Đánh dấu"}</button>
          </div>
          <div className="mt-7">
            <p className="text-lg font-black leading-8 text-slate-950">Câu {index + 1}. {currentQuestion.question?.content ?? "Nội dung câu hỏi không khả dụng"}</p>
            <p className="mt-2 text-sm text-slate-500">{currentQuestion.question ? QUESTION_TYPE_LABELS[currentQuestion.question.type] : ""} · {currentQuestion.points} điểm · Câu trả lời được tự động lưu.</p>
            <div className="mt-6 space-y-3">
              {currentQuestion.question?.type === "ESSAY" ? (
                <textarea value={answer.essayText} disabled={expired} onChange={(event) => scheduleEssaySave({ ...answer, essayText: event.target.value })} onBlur={() => void flushPendingEssay()} rows={8} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-brand-500 disabled:bg-slate-50" placeholder="Nhập câu trả lời của bạn..." />
              ) : currentQuestion.question?.options.map((option) => (
                <button key={option.id} type="button" disabled={expired} onClick={() => setChoice(option.id)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${answer.selectedOptionIds.includes(option.id) ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300"}`}>
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">{option.label}</span><span className="text-sm font-semibold text-slate-700">{option.text}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between gap-2 border-t border-slate-100 pt-5">
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ChevronLeft className="size-4" /> Câu trước</Button>
            <span className="hidden text-xs text-slate-400 sm:block">{saving ? "Đang lưu..." : "Đã lưu trên máy chủ"}</span>
            {index === orderedQuestions.length - 1 ? <Button disabled={submitting} onClick={() => void submit()}><Send className="size-4" /> Nộp bài</Button> : <Button onClick={() => setIndex((value) => value + 1)}>Câu tiếp <ChevronRight className="size-4" /></Button>}
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-black">Danh sách câu hỏi</h2><p className="mt-1 text-xs text-slate-500">Đã làm {answeredCount}/{orderedQuestions.length} câu</p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {orderedQuestions.map((item, itemIndex) => {
              const itemAnswer = currentAnswer(item.questionId);
              const isAnswered = itemAnswer.selectedOptionIds.length > 0 || Boolean(itemAnswer.essayText.trim());
              return <button key={item.questionId} type="button" onClick={() => setIndex(itemIndex)} className={`relative grid size-10 place-items-center rounded-lg text-xs font-black ${itemIndex === index ? "bg-brand-600 text-white" : isAnswered ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{itemIndex + 1}{itemAnswer.flagged ? <span className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500" /> : null}</button>;
            })}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500"><p>{expired ? "Đã hết giờ, hệ thống đang nộp bài." : "Hết giờ hệ thống sẽ tự động nộp bài."}</p><Button className="mt-4 w-full" variant="danger" disabled={submitting} onClick={() => void submit()}>Nộp bài ngay</Button></div>
        </aside>
      </div>
      <ConfirmationDialog open={confirming} title="Xác nhận nộp bài" onClose={() => setConfirming(false)} onConfirm={() => void submit(false)} loading={submitting} confirmLabel="Nộp bài">
        Bạn đã trả lời {answeredCount}/{orderedQuestions.length} câu. Còn {orderedQuestions.length - answeredCount} câu chưa trả lời. Sau khi nộp, bạn không thể chỉnh sửa đáp án.
      </ConfirmationDialog>
    </AssessmentShell>
  );
}

export function StudentResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<(ExamAttempt & { exam: Exam }) | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void examAttemptService.getAttempt(params.id).then((loaded) => {
      if (loaded.status === "IN_PROGRESS") {
        router.replace(`/student/attempts/${params.id}`);
        return;
      }
      setAttempt(loaded);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải kết quả"));
  }, [params.id, router]);

  if (error) return <AssessmentShell student><ErrorPanel message={error} /></AssessmentShell>;
  if (!attempt) return <AssessmentShell student><LoadingPanel /></AssessmentShell>;

  const duration = attempt.durationSeconds !== null ? `${Math.floor(attempt.durationSeconds / 60)} phút ${attempt.durationSeconds % 60} giây` : "—";
  const total = attempt.exam.questions.length;
  const answered = attempt.answers.filter((answer) => answer.selectedOptionIds.length || answer.essayText.trim()).length;
  const canShowScore = attempt.exam.settings.showScoreImmediately && attempt.score !== null;
  const reviewQuestions = [...attempt.exam.questions].sort((left, right) => left.order - right.order);

  return (
    <AssessmentShell student>
      <PageHeading eyebrow="Submission received" title="Đã nộp bài thành công" description="Bài làm của bạn đã được ghi nhận trên hệ thống." action={<Button variant="ghost" onClick={() => router.push("/student/exams")}><ArrowLeft className="size-4" /> Danh sách bài</Button>} />
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-9" /></div>
        <h2 className="mt-5 text-xl font-black">{attempt.exam.title}</h2>
        <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Thời gian làm</p><p className="mt-1 font-black">{duration}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Thời điểm nộp</p><p className="mt-1 font-black">{attempt.submittedAt ? formatDate(attempt.submittedAt) : "—"}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Đã trả lời</p><p className="mt-1 font-black">{answered}/{total}</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Bỏ trống</p><p className="mt-1 font-black">{total - answered}/{total}</p></div>
        </div>
        {canShowScore ? (
          <div className="mt-7 rounded-2xl bg-brand-50 p-5"><p className="text-sm font-bold text-brand-700">Kết quả tự động chấm</p><p className="mt-1 text-4xl font-black text-brand-700">{attempt.score}<span className="text-lg">/{attempt.exam.totalPoints}</span></p><p className="mt-1 text-sm text-slate-600">{attempt.correctCount ?? 0} câu được chấm đúng tự động</p></div>
        ) : (
          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">Bài làm đã được ghi nhận. Điểm chưa được phép hiển thị theo cấu hình của giáo viên.</div>
        )}
      </div>
      {attempt.exam.settings.showCorrectAnswers ? (
        <section className="mx-auto mt-6 max-w-3xl">
          <h2 className="text-lg font-black">Xem lại bài làm</h2>
          <div className="mt-3 space-y-4">
            {reviewQuestions.map((examQuestion, questionIndex) => {
              const question = examQuestion.question;
              const studentAnswer = attempt.answers.find((answer) => answer.questionId === examQuestion.questionId);
              const selectedIds = studentAnswer?.selectedOptionIds ?? [];
              const correctIds = question?.correctOptionIds ?? [];
              const isAutomaticallyCorrect = question?.type !== "ESSAY" &&
                selectedIds.length === correctIds.length &&
                [...selectedIds].sort().every((id, index) => id === [...correctIds].sort()[index]);
              return (
                <article key={examQuestion.questionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-xs font-black uppercase tracking-wide text-brand-600">Câu {questionIndex + 1}</p><h3 className="mt-1 font-black">{question?.content ?? "Câu hỏi không còn khả dụng"}</h3></div>
                    {question?.type !== "ESSAY" ? <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${isAutomaticallyCorrect ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{isAutomaticallyCorrect ? "Đúng" : "Chưa đúng"}</span> : <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Chờ chấm tự luận</span>}
                  </div>
                  {question?.type === "ESSAY" ? (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{studentAnswer?.essayText || "Bỏ trống"}</div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {question?.options.map((option) => {
                        const selected = selectedIds.includes(option.id);
                        const correct = correctIds.includes(option.id);
                        return <div key={option.id} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${correct ? "border-emerald-200 bg-emerald-50 text-emerald-800" : selected ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-100 text-slate-500"}`}><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white font-black">{option.label}</span><span className="font-semibold">{option.text}</span>{correct ? <span className="ml-auto text-xs font-black">Đáp án đúng</span> : selected ? <span className="ml-auto text-xs font-black">Bạn đã chọn</span> : null}</div>;
                      })}
                    </div>
                  )}
                  {question?.explanation ? <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800"><b>Giải thích:</b> {question.explanation}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </AssessmentShell>
  );
}
