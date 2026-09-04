"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  CircleHelp,
  FileSearch,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  RotateCcw,
  Send,
  TimerReset,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ErrorPanel } from "@/components/assessment/assessment-shell";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { examAttemptService } from "@/lib/assessment-api";
import { ApiError } from "@/lib/auth-api";
import type {
  StudyAnalysis,
  StudyLearningPath,
  StudyPracticeMode,
  StudyPracticeSet,
  StudySourceType,
} from "@/types/assessment";

const sourceMeta: Record<
  StudySourceType,
  { label: string; description: string; tone: string }
> = {
  COURSE_MATERIAL: {
    label: "Trong tài liệu môn học",
    description: "Được đối chiếu với tài liệu giáo viên đã gán cho lớp.",
    tone: "bg-emerald-50 text-emerald-700",
  },
  EXTERNAL_KNOWLEDGE: {
    label: "Kiến thức bổ sung",
    description: "Chưa tìm thấy nội dung tương ứng rõ ràng trong tài liệu lớp.",
    tone: "bg-amber-50 text-amber-700",
  },
};

export function StudentStudyAnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [analysis, setAnalysis] = useState<StudyAnalysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [hints, setHints] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setGenerating(false);
    setError("");

    async function loadAnalysis() {
      try {
        let loaded: StudyAnalysis;
        try {
          loaded = await examAttemptService.getStudyAnalysis(params.id);
        } catch (cause) {
          if (!(cause instanceof ApiError) || cause.status !== 404) throw cause;
          if (active) setGenerating(true);
          loaded = await examAttemptService.createStudyAnalysis(params.id);
        }
        if (!active) return;
        setAnalysis(loaded);
        setHints({});
        if (loaded.practiceSet?.status === "SUBMITTED") {
          setAnswers(
            Object.fromEntries(
              loaded.practiceSet.questions.map((question) => [
                question.id,
                question.selectedOptionIds ?? [],
              ]),
            ),
          );
        } else {
          setAnswers({});
        }
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể phân tích kết quả học tập",
        );
      } finally {
        if (active) {
          setLoading(false);
          setGenerating(false);
        }
      }
    }

    void loadAnalysis();
    return () => {
      active = false;
    };
  }, [params.id]);

  const practice = analysis?.practiceSet ?? null;
  const activeTab = searchParams.get("tab") === "practice" ? "practice" : "theory";
  const answeredCount = useMemo(
    () =>
      practice?.questions.filter((question) => answers[question.id]?.length)
        .length ?? 0,
    [answers, practice],
  );

  function choose(questionId: string, optionId: string) {
    if (practice?.status === "SUBMITTED") return;
    setAnswers((current) => ({ ...current, [questionId]: [optionId] }));
  }

  async function submitPractice() {
    if (!practice) return;
    setSubmitting(true);
    setError("");
    try {
      const updated = await examAttemptService.submitStudyPractice(
        practice.id,
        practice.questions.map((question) => ({
          questionId: question.id,
          selectedOptionIds: answers[question.id] ?? [],
        })),
      );
      setAnalysis((current) =>
        current ? { ...current, practiceSet: updated } : current,
      );
      setAnswers(
        Object.fromEntries(
          updated.questions.map((question) => [
            question.id,
            question.selectedOptionIds ?? [],
          ]),
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể nộp bài ôn tập",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPractice() {
    if (!practice) return;
    setRetrying(true);
    setError("");
    try {
      const updated = await examAttemptService.retryStudyPractice(practice.id);
      setAnalysis((current) =>
        current ? { ...current, practiceSet: updated } : current,
      );
      setAnswers({});
      setHints({});
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tạo lượt ôn tập mới",
      );
    } finally {
      setRetrying(false);
    }
  }

  async function getHint(questionId: string) {
    if (!practice || hints[questionId]) return;
    try {
      const hint = await examAttemptService.getStudyPracticeHint(
        practice.id,
        questionId,
      );
      setHints((current) => ({ ...current, [questionId]: hint.message }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lấy gợi ý đáp án");
    }
  }

  function openTab(tab: "theory" | "practice") {
    router.push(`/student/attempts/${params.id}/study?tab=${tab}`);
  }

  if (loading) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-brand-100 bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <BrainCircuit className="size-7 animate-pulse" />
          </span>
          <h1 className="mt-5 text-xl font-black">
            {generating ? "Đang phân tích bài làm" : "Đang tải lộ trình ôn tập"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {generating
              ? "AI đang xác định phần kiến thức còn yếu và đối chiếu với tài liệu giáo viên đã cung cấp."
              : "Đang lấy kết quả phân tích và bộ luyện tập đã lưu của bạn."}
          </p>
          <LoaderCircle className="mx-auto mt-5 size-5 animate-spin text-brand-600" />
        </div>
      </StudentShell>
    );
  }

  if (error && !analysis) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl">
          <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
            <ArrowLeft className="size-4" /> Quay lại kết quả
          </Button>
          <ErrorPanel message={error} />
        </div>
      </StudentShell>
    );
  }
  if (!analysis) return null;

  const { report } = analysis;
  return (
    <StudentShell>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.push("/student/review")}>
          <ArrowLeft className="size-4" /> Quay lại ôn tập
        </Button>
      </div>

      {error ? (
        <div className="mb-5">
          <ErrorPanel message={error} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)] lg:items-center">
          <div>
            <p className="text-sm font-bold text-brand-600">
              {report.exam.subjectName} · {report.exam.className}
            </p>
            <h1 className="mt-1.5 text-2xl font-black text-slate-950 sm:text-3xl">
              Kết quả và lộ trình ôn tập
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {report.summary}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold text-brand-600">Độ chính xác</p>
              <p className="mt-1 text-2xl font-black text-brand-800">
                {report.performance.accuracy}%
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Câu đúng</p>
              <p className="mt-1 text-2xl font-black text-emerald-800">
                {report.performance.correctCount}/
                {report.performance.totalQuestions}
              </p>
            </div>
            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-700">Điểm bài làm</p>
              <p className="mt-1 text-2xl font-black text-violet-800">{report.performance.score ?? "—"}/{report.performance.totalPoints}</p>
            </div>
          </div>
        </div>
      </section>

      <nav className="mt-5 flex w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-card sm:w-fit">
        <Button
          variant={activeTab === "theory" ? "primary" : "ghost"}
          className="gap-2"
          onClick={() => openTab("theory")}
        >
          <BookOpen className="size-4" /> Ôn tập lý thuyết
        </Button>
        <Button
          variant={activeTab === "practice" ? "primary" : "ghost"}
          className="gap-2"
          onClick={() => openTab("practice")}
        >
          <BrainCircuit className="size-4" /> Luyện tập
        </Button>
      </nav>

      {activeTab === "theory" && report.performance.needsWarning ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-black">Kết quả hiện tại dưới mức trung bình</p>
            <p className="mt-1 leading-6">
              Bạn nên hoàn thành lộ trình bên dưới theo đúng thứ tự, ưu tiên các
              chủ đề có độ chính xác thấp trước.
            </p>
          </div>
        </div>
      ) : null}

      {activeTab === "theory" && report.aiStatus === "FALLBACK" ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Hiện AI chưa tạo được phần tổng hợp chi tiết. Thống kê chủ đề và
            nguồn tài liệu vẫn được giữ nguyên; bộ câu hỏi ôn tập sẽ xuất hiện
            khi dịch vụ AI hoạt động lại.
          </p>
        </div>
      ) : null}

      {activeTab === "theory" ? (
        <>
          <LearningPathSection learningPath={report.learningPath} />

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-brand-700">
              <FileSearch className="size-5" />
            </span>
            <div>
              <h2 className="font-black">Kết quả theo chủ đề</h2>
              <p className="text-xs text-slate-500">Ưu tiên phần có tỷ lệ thấp</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {report.topicPerformance.map((topic) => (
              <div key={topic.topicName} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-700">
                    {topic.topicName}
                  </span>
                  <span className="font-black text-slate-900">
                    {topic.accuracy}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${topic.accuracy >= 80 ? "bg-emerald-500" : topic.accuracy >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${topic.accuracy}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {topic.correctCount}/{topic.totalQuestions} câu đúng
                </p>
              </div>
            ))}
          </div>
          </section>

        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-black">Nội dung cần ôn lại</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gợi ý được tách rõ theo nguồn để bạn biết nội dung nào thuộc tài
              liệu chính thức của lớp.
            </p>
          </div>
          {report.weakAreas.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
              <h3 className="mt-3 font-black text-emerald-800">
                Chưa phát hiện lỗ hổng kiến thức
              </h3>
              <p className="mt-1 text-sm text-emerald-700">
                Bạn đã trả lời đúng toàn bộ câu hỏi có thể chấm tự động.
              </p>
            </div>
          ) : (
            report.weakAreas.map((area) => {
              const meta = sourceMeta[area.sourceType];
              return (
                <article
                  key={area.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                      <h3 className="mt-3 text-lg font-black">
                        {area.topicName}
                      </h3>
                    </div>
                    <span className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                      Sai {area.missedCount}/{area.totalQuestions} câu
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
                    {area.diagnosis}
                  </p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                      <Lightbulb className="size-4 text-amber-500" /> Gợi ý ôn tập
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {area.reviewSummary}
                    </p>
                    {area.keyPoints.length ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {area.keyPoints.map((point) => (
                          <li key={point} className="flex gap-2">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {area.sourceReferences.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {area.sourceReferences.map((source) => (
                        <span
                          key={`${source.documentName}-${source.page}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                        >
                          <BookOpen className="size-3.5" /> {source.documentName} ·
                          trang {source.page}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs font-medium text-amber-700">
                      {meta.description}
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
        </>
      ) : null}

      {activeTab === "practice" ? (
        <PracticeSection
          practice={practice}
          answers={answers}
          answeredCount={answeredCount}
          submitting={submitting}
          retrying={retrying}
          hints={hints}
          onChoose={choose}
          onSubmit={() => void submitPractice()}
          onRetry={() => void retryPractice()}
          onGetHint={(questionId) => void getHint(questionId)}
        />
      ) : null}
    </StudentShell>
  );
}

function LearningPathSection({
  learningPath,
}: {
  learningPath: StudyLearningPath;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <ListChecks className="size-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-600">Lộ trình đề xuất</p>
            <h2 className="mt-1 text-xl font-black">Học theo từng bước</h2>
            <p className="mt-1 text-sm text-slate-500">
              Hoàn thành lần lượt để củng cố phần kiến thức còn yếu.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-brand-700">
          <Clock3 className="size-3.5" /> Khoảng {learningPath.totalDurationMinutes} phút
        </span>
      </div>

      <ol className="mt-5 space-y-3">
        {learningPath.steps.map((step) => (
          <li
            key={`${step.order}-${step.topicName}`}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-sm font-black text-white">
                {step.order}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-brand-600">{step.topicName}</p>
                <h3 className="mt-1 font-black text-slate-900">{step.title}</h3>
              </div>
              <span className="ml-auto shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                {step.durationMinutes} phút
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Mục tiêu
              </p>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {step.objective}
              </p>
            </div>
            <div className="mt-3 rounded-xl bg-emerald-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                Cần hoàn thành
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                {step.activities.map((activity) => (
                  <li key={activity} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PracticeSection({
  practice,
  answers,
  answeredCount,
  submitting,
  retrying,
  hints,
  onChoose,
  onSubmit,
  onRetry,
  onGetHint,
}: {
  practice: StudyPracticeSet | null;
  answers: Record<string, string[]>;
  answeredCount: number;
  submitting: boolean;
  retrying: boolean;
  hints: Record<string, string>;
  onChoose: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onGetHint: (questionId: string) => void;
}) {
  const [mode, setMode] = useState<StudyPracticeMode>("EASY");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const submitted = practice?.status === "SUBMITTED";
  const practiceDuration = Math.max(300, (practice?.totalQuestions ?? 0) * 120);

  useEffect(() => {
    setStarted(false);
    setIndex(0);
    setRemainingSeconds(practiceDuration);
  }, [practice?.id, practice?.status, practiceDuration]);

  useEffect(() => {
    if (!started || mode !== "HARD" || submitted || remainingSeconds <= 0) return;
    const timer = window.setInterval(
      () => setRemainingSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [mode, remainingSeconds, started, submitted]);

  if (!practice) return null;
  const timeExpired = mode === "HARD" && started && remainingSeconds === 0;
  const locked = submitted || timeExpired;
  const formattedRemaining = `${Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(remainingSeconds % 60).toString().padStart(2, "0")}`;
  const currentQuestion = practice.questions[index];
  return (
    <section className="mt-8 rounded-2xl border border-violet-200 bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-700">
            <BrainCircuit className="size-5" />
            <p className="text-xs font-black uppercase tracking-[0.14em]">
              Luyện tập thích ứng
            </p>
          </div>
          <h2 className="mt-2 text-xl font-black">Câu hỏi ôn tập dành cho bạn</h2>
          <p className="mt-1 text-sm text-slate-500">
            Câu hỏi mới được tạo từ đúng những chủ đề bạn đang thiếu hụt.
          </p>
        </div>
        {submitted ? (
          <div className="rounded-xl bg-violet-50 px-4 py-3 text-right">
            <p className="text-xs font-bold text-violet-500">Kết quả ôn tập</p>
            <p className="text-2xl font-black text-violet-700">
              {practice.correctCount}/{practice.totalQuestions}
            </p>
          </div>
        ) : mode === "HARD" && started ? (
          <div className={`rounded-xl px-4 py-3 text-right ${timeExpired ? "bg-rose-50" : "bg-slate-100"}`}>
            <p className={`text-xs font-bold ${timeExpired ? "text-rose-600" : "text-slate-500"}`}>
              {timeExpired ? "Đã hết thời gian" : "Thời gian còn lại"}
            </p>
            <p className={`text-2xl font-black ${timeExpired ? "text-rose-700" : "text-slate-800"}`}>
              {formattedRemaining}
            </p>
          </div>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {answeredCount}/{practice.totalQuestions} câu đã chọn
          </span>
        )}
      </div>

      {submitted && practice.correctCount === practice.totalQuestions ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
            <Trophy className="size-5" />
          </span>
          <div>
            <p className="font-black">Chúc mừng! Bạn đã trả lời đúng tất cả câu hỏi.</p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              Bạn đã hoàn thành tốt phần luyện tập này. Hãy tiếp tục duy trì phong độ ở các chủ đề khác nhé.
            </p>
          </div>
        </div>
      ) : null}

      {!submitted && !started ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
          <p className="text-sm font-black text-slate-900">Chọn chế độ luyện tập</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("EASY");
                setStarted(false);
                setRemainingSeconds(practiceDuration);
              }}
              className={`rounded-xl border p-4 text-left transition ${mode === "EASY" ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}
            >
              <div className="flex items-center gap-2 font-black text-emerald-800">
                <CircleHelp className="size-5" /> Dễ · học có hướng dẫn
              </div>
              <p className="mt-1.5 text-sm leading-5 text-slate-600">
                Có nút gợi ý đáp án. Bạn có thể làm lại đến khi trả lời đúng tất cả câu hỏi.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("HARD");
                setStarted(false);
                setRemainingSeconds(practiceDuration);
              }}
              className={`rounded-xl border p-4 text-left transition ${mode === "HARD" ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-300"}`}
            >
              <div className="flex items-center gap-2 font-black text-violet-800">
                <TimerReset className="size-5" /> Khó · mô phỏng kiểm tra
              </div>
              <p className="mt-1.5 text-sm leading-5 text-slate-600">
                Có giới hạn thời gian, không gợi ý và không hiện đáp án khi bạn chọn.
              </p>
            </button>
          </div>
          {!started ? (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  setRemainingSeconds(practiceDuration);
                  setStarted(true);
                }}
              >
                {mode === "HARD" ? <TimerReset className="size-4" /> : <BrainCircuit className="size-4" />}
                Bắt đầu luyện tập {mode === "HARD" ? `(${Math.ceil(practiceDuration / 60)} phút)` : ""}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {started && !submitted && currentQuestion ? (
        <PracticeQuestionRunner
          practice={practice}
          question={currentQuestion}
          questionIndex={index}
          answers={answers}
          mode={mode}
          hints={hints}
          locked={locked}
          timeExpired={timeExpired}
          submitting={submitting}
          onChoose={onChoose}
          onGetHint={onGetHint}
          onGoTo={setIndex}
          onSubmit={onSubmit}
        />
      ) : null}

      {submitted ? <div className="mt-6 space-y-5">
        {practice.questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-brand-600">
                  Câu {index + 1} · {question.topicName}
                </p>
                <h3 className="mt-2 font-bold leading-6">{question.content}</h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${sourceMeta[question.sourceType].tone}`}
              >
                {sourceMeta[question.sourceType].label}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {question.options.map((option) => {
                const selected = answers[question.id]?.includes(option.id);
                const isCorrectOption = question.correctOptionIds?.includes(
                  option.id,
                );
                const tone = submitted
                  ? isCorrectOption
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : selected
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 text-slate-500"
                  : selected
                    ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100"
                    : "border-slate-200 text-slate-700 hover:border-brand-300";
                return (
                  <button
                    type="button"
                    key={option.id}
                    disabled={locked}
                    onClick={() => onChoose(question.id, option.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition ${tone}`}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/80 text-xs font-black">
                      {option.label}
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>
            {submitted ? (
              <div
                className={`mt-4 rounded-xl p-4 text-sm ${question.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
              >
                <p className="font-black">
                  {question.correct ? "Trả lời đúng" : "Cần ôn lại phần này"}
                </p>
                <p className="mt-1 leading-6">{question.explanation}</p>
              </div>
            ) : mode === "EASY" ? (
              <div className="mt-4">
                {hints[question.id] ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    {hints[question.id]}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-amber-700 hover:text-amber-800"
                    onClick={() => onGetHint(question.id)}
                  >
                    <Lightbulb className="size-3.5" /> Gợi ý đáp án
                  </Button>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </div> : null}

      {submitted && practice.correctCount !== practice.totalQuestions ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-600">
            {mode === "EASY"
              ? "Bạn có thể làm lại để chinh phục toàn bộ câu hỏi."
              : "Bạn có thể bắt đầu một lượt mô phỏng mới nếu muốn thử lại."}
          </p>
          <Button variant="outline" disabled={retrying} onClick={onRetry}>
            {retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            {retrying ? "Đang tạo lượt mới..." : "Làm lại"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PracticeQuestionRunner({
  practice,
  question,
  questionIndex,
  answers,
  mode,
  hints,
  locked,
  timeExpired,
  submitting,
  onChoose,
  onGetHint,
  onGoTo,
  onSubmit,
}: {
  practice: StudyPracticeSet;
  question: StudyPracticeSet["questions"][number];
  questionIndex: number;
  answers: Record<string, string[]>;
  mode: StudyPracticeMode;
  hints: Record<string, string>;
  locked: boolean;
  timeExpired: boolean;
  submitting: boolean;
  onChoose: (questionId: string, optionId: string) => void;
  onGetHint: (questionId: string) => void;
  onGoTo: (index: number) => void;
  onSubmit: () => void;
}) {
  const answeredCount = practice.questions.filter(
    (item) => answers[item.id]?.length,
  ).length;
  const isLastQuestion = questionIndex === practice.questions.length - 1;

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-black text-brand-700">
            Câu {questionIndex + 1} / {practice.totalQuestions}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${sourceMeta[question.sourceType].tone}`}
          >
            {sourceMeta[question.sourceType].label}
          </span>
        </div>
        <div className="mt-7">
          <p className="text-lg font-black leading-8 text-slate-950">
            Câu {questionIndex + 1}. {question.content}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Chủ đề: {question.topicName} · Chọn một đáp án phù hợp nhất.
          </p>
          <div className="mt-6 space-y-3">
            {question.options.map((option) => {
              const selected = answers[question.id]?.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={locked}
                  onClick={() => onChoose(question.id, option.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300"}`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">
                    {option.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>
          {mode === "EASY" ? (
            <div className="mt-5">
              {hints[question.id] ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  {hints[question.id]}
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-amber-700 hover:text-amber-800"
                  onClick={() => onGetHint(question.id)}
                >
                  <Lightbulb className="size-3.5" /> Gợi ý đáp án
                </Button>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          <Button
            variant="outline"
            disabled={questionIndex === 0}
            onClick={() => onGoTo(questionIndex - 1)}
          >
            <ChevronLeft className="size-4" /> Câu trước
          </Button>
          <span className="text-xs text-slate-400">
            {timeExpired ? "Đã hết giờ" : "Đáp án được lưu trong phiên này"}
          </span>
          {isLastQuestion ? (
            <Button
              disabled={(!timeExpired && answeredCount < practice.totalQuestions) || submitting}
              onClick={onSubmit}
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {submitting ? "Đang chấm..." : "Nộp bài"}
            </Button>
          ) : (
            <Button onClick={() => onGoTo(questionIndex + 1)}>
              Câu tiếp <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-black">Danh sách câu hỏi</h2>
        <p className="mt-1 text-xs text-slate-500">
          Đã làm {answeredCount}/{practice.totalQuestions} câu
        </p>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {practice.questions.map((item, itemIndex) => {
            const answered = Boolean(answers[item.id]?.length);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onGoTo(itemIndex)}
                className={`grid size-10 place-items-center rounded-lg text-xs font-black ${itemIndex === questionIndex ? "bg-brand-600 text-white" : answered ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {itemIndex + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs leading-5 text-slate-500">
            {mode === "HARD"
              ? "Đáp án chỉ được hiển thị sau khi nộp bài hoặc hết giờ."
              : "Bạn có thể dùng gợi ý và làm lại nếu chưa đạt toàn bộ câu đúng."}
          </p>
          <Button
            className="mt-4 w-full"
            variant="danger"
            disabled={(!timeExpired && answeredCount < practice.totalQuestions) || submitting}
            onClick={onSubmit}
          >
            <Send className="size-4" /> Nộp bài ngay
          </Button>
        </div>
      </aside>
    </div>
  );
}
