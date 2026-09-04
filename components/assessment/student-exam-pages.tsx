"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-control";
import { examAttemptService, examService } from "@/lib/assessment-api";
import {
  EXAM_STATUS_LABELS,
  QUESTION_TYPE_LABELS,
  type Exam,
  type ExamAnswer,
  type ExamAttempt,
  type StudyAnalysis,
  type StudentExamStatus,
} from "@/types/assessment";

const studentStatusMeta: Record<
  StudentExamStatus,
  { label: string; tone: string }
> = {
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

function statusTone(status: Exam["status"]) {
  return {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-amber-50 text-amber-700",
    ONGOING: "bg-emerald-50 text-emerald-700",
    ENDED: "bg-blue-50 text-blue-700",
  }[status];
}

export function StudentExamList({
  classId,
  subjectId,
}: {
  classId: string;
  subjectId: string;
}) {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState("");
  useEffect(() => {
    void examService
      .getExams()
      .then((items) =>
        setExams(
          items.filter(
            (exam) =>
              exam.classId === classId && exam.subjectId === subjectId,
          ),
        ),
      )
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải bài kiểm tra",
        ),
      )
      .finally(() => setLoading(false));
  }, [classId, subjectId]);
  async function start(exam: Exam) {
    setStarting(exam.id);
    setError("");
    try {
      const attempt = await examAttemptService.startExam(exam.id);
      router.push(`/student/attempts/${attempt.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể bắt đầu bài kiểm tra",
      );
    } finally {
      setStarting("");
    }
  }

  return (
    <>
      {error ? (
        <div className="mb-5">
          <ErrorPanel message={error} />
        </div>
      ) : null}
      {loading ? (
        <LoadingPanel />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm text-slate-500">
              Hiện chưa có bài kiểm tra được công bố.
            </div>
          ) : (
            exams.map((exam) => (
              <article
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${statusTone(exam.status)}`}
                    >
                      {EXAM_STATUS_LABELS[exam.status]}
                    </span>
                    <h2 className="mt-3 text-lg font-black">{exam.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {exam.subjectName} · Giáo viên{" "}
                      {exam.teacherName ?? "phụ trách môn"}
                    </p>
                  </div>
                  <div className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Clock3 className="size-5" />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Câu hỏi</p>
                    <p className="mt-1 font-extrabold">
                      {exam.questions.length} câu
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Thời lượng</p>
                    <p className="mt-1 font-extrabold">
                      {exam.settings.durationMinutes} phút
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Thời gian mở</p>
                    <p className="mt-1 font-semibold">
                      {new Date(exam.settings.startsAt).toLocaleString("vi-VN")}{" "}
                      – {new Date(exam.settings.endsAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/student/exams/${exam.id}`)}
                  >
                    <Eye className="size-4" /> Xem chi tiết
                  </Button>
                  <Button
                    disabled={
                      exam.status !== "ONGOING" || starting === exam.id
                    }
                    onClick={() => void start(exam)}
                  >
                    {starting === exam.id
                      ? "Đang mở bài..."
                      : exam.status === "ONGOING"
                        ? "Bắt đầu làm bài"
                        : exam.status === "SCHEDULED"
                          ? "Chưa đến giờ mở"
                          : "Không thể bắt đầu"}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </>
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
    void examService
      .getExamById(params.id)
      .then(setExam)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải bài kiểm tra",
        ),
      )
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
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể bắt đầu bài kiểm tra",
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading)
    return (
      <AssessmentShell student>
        <LoadingPanel />
      </AssessmentShell>
    );
  if (error && !exam)
    return (
      <AssessmentShell student>
        <ErrorPanel message={error} />
      </AssessmentShell>
    );
  if (!exam) return null;

  const status = getStudentStatus(exam);
  const meta = studentStatusMeta[status];
  const currentAttempt = exam.currentAttempt;

  return (
    <AssessmentShell student>
      <PageHeading
        eyebrow="Exam overview"
        title={exam.title}
        description={`${exam.subjectName} · ${exam.className}`}
        action={
          <Button
            variant="ghost"
            onClick={() =>
              router.push(
                `/student/courses/${encodeURIComponent(exam.classId)}/${encodeURIComponent(exam.subjectId)}`,
              )
            }
          >
            <ArrowLeft className="size-4" /> Quay lại môn học
          </Button>
        }
      />
      {error ? (
        <div className="mb-5">
          <ErrorPanel message={error} />
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${meta.tone}`}
          >
            {meta.label}
          </span>
          <h2 className="mt-5 text-xl font-black">Thông tin bài kiểm tra</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {exam.description ||
              "Giáo viên không cung cấp mô tả cho bài kiểm tra này."}
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Môn học</p>
              <p className="mt-1 font-black">{exam.subjectName}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Giáo viên</p>
              <p className="mt-1 font-black">
                {exam.teacherName ?? "Giáo viên phụ trách"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Số câu hỏi</p>
              <p className="mt-1 font-black">{exam.questions.length} câu</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Tổng điểm</p>
              <p className="mt-1 font-black">{exam.totalPoints} điểm</p>
            </div>
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <CalendarClock className="size-5 text-brand-600" />
            <h2 className="font-black">Thời gian làm bài</h2>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Bắt đầu</dt>
              <dd className="mt-1 font-bold">
                {formatDate(exam.settings.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Kết thúc</dt>
              <dd className="mt-1 font-bold">
                {formatDate(exam.settings.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Thời lượng</dt>
              <dd className="mt-1 font-bold">
                {exam.settings.durationMinutes} phút
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Số lần được phép</dt>
              <dd className="mt-1 font-bold">
                {exam.settings.attemptsAllowed} lần · còn{" "}
                {exam.attemptsRemaining ?? exam.settings.attemptsAllowed} lần
              </dd>
            </div>
          </dl>
          {status === "IN_PROGRESS" && currentAttempt ? (
            <Button
              className="mt-6 w-full"
              onClick={() =>
                router.push(`/student/attempts/${currentAttempt.id}`)
              }
            >
              <RotateCcw className="size-4" /> Tiếp tục làm bài
            </Button>
          ) : null}
          {status === "SUBMITTED" && currentAttempt ? (
            <Button
              className="mt-6 w-full"
              variant={exam.canStart ? "outline" : "primary"}
              onClick={() =>
                router.push(`/student/attempts/${currentAttempt.id}/result`)
              }
            >
              <Eye className="size-4" /> Xem kết quả
            </Button>
          ) : null}
          {status === "AVAILABLE" || exam.canStart ? (
            <Button
              className="mt-2 w-full"
              disabled={starting}
              onClick={() => void start()}
            >
              <Play className="size-4" />
              {starting
                ? "Đang bắt đầu..."
                : exam.attemptsUsed
                  ? "Bắt đầu lượt mới"
                  : "Bắt đầu làm bài"}
            </Button>
          ) : null}
          {status === "UPCOMING" ? (
            <Button className="mt-6 w-full" disabled>
              Chưa đến thời gian mở bài
            </Button>
          ) : null}
          {status === "ENDED" ? (
            <Button className="mt-6 w-full" disabled>
              Bài kiểm tra đã kết thúc
            </Button>
          ) : null}
        </aside>
      </div>
    </AssessmentShell>
  );
}

export function StudentAttemptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const answerStorageKey = `estude:exam-attempt:${params.id}:answers`;
  const [attempt, setAttempt] = useState<(ExamAttempt & { exam: Exam }) | null>(
    null,
  );
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    void examAttemptService
      .getAttempt(params.id)
      .then((loaded) => {
        setAttempt(loaded);
        const mapped: Record<string, ExamAnswer> = {};
        loaded.answers.forEach((answer) => {
          mapped[answer.questionId] = answer;
        });
        if (loaded.status === "SUBMITTED") {
          window.localStorage.removeItem(answerStorageKey);
        } else {
          try {
            const storedAnswers = JSON.parse(
              window.localStorage.getItem(answerStorageKey) ?? "[]",
            ) as ExamAnswer[];
            if (Array.isArray(storedAnswers)) {
              storedAnswers.forEach((answer) => {
                if (answer?.questionId) mapped[answer.questionId] = answer;
              });
            }
          } catch {
            window.localStorage.removeItem(answerStorageKey);
          }
        }
        setAnswers(mapped);
        setSecondsLeft(
          Math.max(
            0,
            Math.floor(
              ((loaded.expiresAt
                ? new Date(loaded.expiresAt).getTime()
                : new Date(loaded.startedAt).getTime() +
                  loaded.exam.settings.durationMinutes * 60_000) -
                Date.now()) /
                1000,
            ),
          ),
        );
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải bài làm",
        ),
      )
      .finally(() => setLoading(false));
  }, [answerStorageKey, params.id]);
  const orderedQuestions = useMemo(
    () =>
      attempt
        ? [...attempt.exam.questions].sort((a, b) => a.order - b.order)
        : [],
    [attempt],
  );
  const currentQuestion = orderedQuestions[index];
  useEffect(() => {
    if (!attempt || attempt.status === "SUBMITTED" || secondsLeft <= 0) return;
    const timer = window.setInterval(
      () => setSecondsLeft((value) => value - 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [attempt, secondsLeft]);
  useEffect(() => {
    if (attempt && secondsLeft === 0 && attempt.status === "IN_PROGRESS")
      void submit(true);
    // submit is intentionally called when the server-backed countdown reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, attempt]);
  function currentAnswer(questionId: string): ExamAnswer {
    return (
      answers[questionId] ?? {
        questionId,
        selectedOptionIds: [],
        essayText: "",
        flagged: false,
      }
    );
  }
  function saveLocally(answer: ExamAnswer) {
    setAnswers((current) => {
      const updated = { ...current, [answer.questionId]: answer };
      window.localStorage.setItem(
        answerStorageKey,
        JSON.stringify(Object.values(updated)),
      );
      return updated;
    });
  }
  function setChoice(optionId: string) {
    if (!currentQuestion) return;
    const questionAnswer = currentAnswer(currentQuestion.questionId);
    const isMultiple = currentQuestion.question?.type === "MULTIPLE_CHOICE";
    const selected = isMultiple
      ? questionAnswer.selectedOptionIds.includes(optionId)
        ? questionAnswer.selectedOptionIds.filter((id) => id !== optionId)
        : [...questionAnswer.selectedOptionIds, optionId]
      : [optionId];
    saveLocally({ ...questionAnswer, selectedOptionIds: selected });
  }
  async function submit(auto = false) {
    if (!attempt || attempt.status === "SUBMITTED") return;
    if (!auto && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setSaving(true);
    try {
      await examAttemptService.submitExam(params.id, Object.values(answers));
      window.localStorage.removeItem(answerStorageKey);
      router.push(`/student/attempts/${params.id}/result`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể nộp bài");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <AssessmentShell student>
        <LoadingPanel />
      </AssessmentShell>
    );
  if (error && !attempt)
    return (
      <AssessmentShell student>
        <ErrorPanel message={error} />
      </AssessmentShell>
    );
  if (!attempt || !currentQuestion) return null;
  const answer = currentAnswer(currentQuestion.questionId);
  const answeredCount = Object.values(answers).filter(
    (item) => item.selectedOptionIds.length > 0 || item.essayText.trim(),
  ).length;
  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return (
    <AssessmentShell student>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
            Đang làm bài
          </p>
          <h1 className="mt-1 text-xl font-black sm:text-2xl">
            {attempt.exam.title}
          </h1>
          {attempt.examCode ? (
            <span className="mt-2 inline-flex rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-black text-brand-700">
              Mã đề {attempt.examCode}
            </span>
          ) : null}
        </div>
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-black ${secondsLeft < 300 ? "bg-rose-50 text-rose-700" : "bg-slate-950 text-white"}`}
        >
          <Clock3 className="size-5" />
          {minutes}:{seconds}
        </div>
      </div>
      {error ? (
        <div className="mb-4">
          <ErrorPanel message={error} />
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
          <div className="flex items-center justify-between text-sm">
            <span className="font-black text-brand-700">
              Câu {index + 1} / {orderedQuestions.length}
            </span>
            <button
              type="button"
              onClick={() =>
                saveLocally({ ...answer, flagged: !answer.flagged })
              }
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${answer.flagged ? "bg-amber-50 text-amber-700" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Flag className="size-4" />
              {answer.flagged ? "Đã đánh dấu" : "Đánh dấu"}
            </button>
          </div>
          <div className="mt-7">
            <p className="text-lg font-black leading-8 text-slate-950">
              Câu {index + 1}.{" "}
              {currentQuestion.question?.content ??
                "Nội dung câu hỏi không khả dụng"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {currentQuestion.question
                ? QUESTION_TYPE_LABELS[currentQuestion.question.type]
                : ""}{" "}
              · Câu trả lời chỉ được lưu tạm trong phiên làm bài trên thiết bị
              này.
            </p>
            <div className="mt-6 space-y-3">
              {currentQuestion.question?.type === "ESSAY" ? (
                <Textarea
                  value={answer.essayText}
                  onChange={(event) =>
                    saveLocally({
                      ...answer,
                      essayText: event.target.value,
                    })
                  }
                  rows={8}
                  className="min-h-48"
                  placeholder="Nhập câu trả lời của bạn..."
                />
              ) : (
                currentQuestion.question?.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setChoice(option.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${answer.selectedOptionIds.includes(option.id) ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300"}`}
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">
                      {option.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {option.text}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((value) => value - 1)}
            >
              <ChevronLeft className="size-4" /> Câu trước
            </Button>
            <span className="text-xs text-slate-400">
              {saving ? "Đang nộp bài..." : "Đã lưu tạm trên thiết bị"}
            </span>
            {index === orderedQuestions.length - 1 ? (
              <Button onClick={() => void submit()}>
                <Send className="size-4" /> Nộp bài
              </Button>
            ) : (
              <Button onClick={() => setIndex((value) => value + 1)}>
                Câu tiếp <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-black">Danh sách câu hỏi</h2>
          <p className="mt-1 text-xs text-slate-500">
            Đã làm {answeredCount}/{orderedQuestions.length} câu
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {orderedQuestions.map((item, itemIndex) => {
              const itemAnswer = currentAnswer(item.questionId);
              const isAnswered =
                itemAnswer.selectedOptionIds.length > 0 ||
                Boolean(itemAnswer.essayText.trim());
              return (
                <button
                  key={item.questionId}
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  className={`relative grid size-10 place-items-center rounded-lg text-xs font-black ${itemIndex === index ? "bg-brand-600 text-white" : isAnswered ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {itemIndex + 1}
                  {itemAnswer.flagged ? (
                    <span className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <p>Hết giờ sẽ tự động nộp bài.</p>
            <Button
              className="mt-4 w-full"
              variant="danger"
              onClick={() => void submit()}
            >
              Nộp bài ngay
            </Button>
          </div>
        </aside>
      </div>
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-amber-500" />
              <div>
                <h2 className="font-black">Xác nhận nộp bài</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Bạn đã trả lời {answeredCount}/{orderedQuestions.length} câu.
                  Còn {orderedQuestions.length - answeredCount} câu chưa trả
                  lời. Bạn có chắc chắn muốn nộp bài không?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Tiếp tục làm
              </Button>
              <Button onClick={() => void submit(false)}>Nộp bài</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AssessmentShell>
  );
}

export function StudentResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<(ExamAttempt & { exam: Exam }) | null>(
    null,
  );
  const [analysis, setAnalysis] = useState<StudyAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void examAttemptService
      .getAttempt(params.id)
      .then((loaded) => {
        if (active) setAttempt(loaded);
      })
      .catch((cause) =>
        active
          ? setError(
              cause instanceof Error ? cause.message : "Không thể tải kết quả",
            )
          : undefined,
      );

    void examAttemptService
      .createStudyAnalysis(params.id)
      .then((loaded) => {
        if (active) setAnalysis(loaded);
      })
      .catch((cause) => {
        if (active) {
          setAnalysisError(
            cause instanceof Error
              ? cause.message
              : "Không thể tự động phân tích bài làm",
          );
        }
      })
      .finally(() => {
        if (active) setAnalysisLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  async function retryStudyAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      setAnalysis(await examAttemptService.createStudyAnalysis(params.id));
    } catch (cause) {
      setAnalysisError(
        cause instanceof Error
          ? cause.message
          : "Không thể tự động phân tích bài làm",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  if (error)
    return (
      <AssessmentShell student>
        <ErrorPanel message={error} />
      </AssessmentShell>
    );
  if (!attempt)
    return (
      <AssessmentShell student>
        <LoadingPanel />
      </AssessmentShell>
    );
  const duration = attempt.durationSeconds
    ? `${Math.floor(attempt.durationSeconds / 60)} phút ${attempt.durationSeconds % 60} giây`
    : "—";
  const total = attempt.exam.questions.length;
  const scorePercentage =
    attempt.score !== null && attempt.exam.totalPoints > 0
      ? Math.round((attempt.score / attempt.exam.totalPoints) * 100)
      : null;
  const needsWarning =
    analysis?.report.performance.needsWarning ??
    (scorePercentage !== null && scorePercentage < 50);
  const showLowScoreWarning =
    attempt.exam.settings.showScoreImmediately && needsWarning;
  return (
    <AssessmentShell student>
      <PageHeading
        eyebrow="Submission received"
        title="Đã nộp bài thành công"
        description="Bài làm của bạn đã được ghi nhận trên hệ thống."
        action={
          <Button
            variant="ghost"
            onClick={() =>
              router.push(
                `/student/courses/${encodeURIComponent(attempt.exam.classId)}/${encodeURIComponent(attempt.exam.subjectId)}`,
              )
            }
          >
            <ArrowLeft className="size-4" /> Quay lại môn học
          </Button>
        }
      />
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </div>
        <h2 className="mt-5 text-xl font-black">{attempt.exam.title}</h2>
        {attempt.examCode ? (
          <span className="mt-2 inline-flex rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-black text-brand-700">
            Mã đề {attempt.examCode}
          </span>
        ) : null}
        <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Thời gian làm</p>
            <p className="mt-1 font-black">{duration}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Đã trả lời</p>
            <p className="mt-1 font-black">
              {
                attempt.answers.filter(
                  (answer) =>
                    answer.selectedOptionIds.length || answer.essayText,
                ).length
              }
              /{total}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">Thời điểm nộp</p>
            <p className="mt-1 font-black">
              {attempt.submittedAt
                ? new Date(attempt.submittedAt).toLocaleTimeString("vi-VN")
                : "—"}
            </p>
          </div>
        </div>
        {attempt.exam.settings.showScoreImmediately ? (
          <div className="mt-7 rounded-2xl bg-brand-50 p-5">
            <p className="text-sm font-bold text-brand-700">Kết quả tạm thời</p>
            <p className="mt-1 text-4xl font-black text-brand-700">
              {attempt.score ?? 0}
              <span className="text-lg">/{attempt.exam.totalPoints}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {attempt.correctCount ?? 0}/{total} câu trắc nghiệm đúng
            </p>
          </div>
        ) : (
          <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
            Bài làm đã được ghi nhận. Kết quả sẽ hiển thị khi giáo viên công bố.
          </div>
        )}

        {showLowScoreWarning ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-black">Cảnh báo kết quả dưới trung bình</p>
              <p className="mt-1 leading-6">
                Điểm của bạn đang dưới 5/10. AI đã ưu tiên các chủ đề còn yếu
                để tạo lộ trình ôn tập phù hợp.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-violet-700">
              {analysisLoading ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-violet-900">
                {analysisLoading
                  ? "AI đang phân tích bài làm"
                  : analysis
                    ? "Đã tạo phân tích và lộ trình học"
                    : "Chưa thể tạo phân tích AI"}
              </p>
              <p className="mt-1 text-sm leading-6 text-violet-700">
                {analysisLoading
                  ? "Hệ thống đang xác định phần kiến thức cần củng cố và xây dựng lộ trình tự động."
                  : analysis
                    ? `Lộ trình gồm ${analysis.report.learningPath.steps.length} bước, dự kiến ${analysis.report.learningPath.totalDurationMinutes} phút.`
                    : analysisError}
              </p>
            </div>
          </div>

          {analysis ? (
            <Button
              className="mt-4 w-full"
              onClick={() => router.push(`/student/attempts/${attempt.id}/study`)}
            >
              <Sparkles className="size-4" /> Xem phân tích và lộ trình học
            </Button>
          ) : analysisLoading ? null : (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => void retryStudyAnalysis()}
            >
              Thử phân tích lại
            </Button>
          )}
        </div>
      </div>
    </AssessmentShell>
  );
}
