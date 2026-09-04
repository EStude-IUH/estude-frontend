"use client";

import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  FileSearch,
  Lightbulb,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorPanel } from "@/components/assessment/assessment-shell";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { examAttemptService } from "@/lib/assessment-api";
import type {
  StudyAnalysis,
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
  const [analysis, setAnalysis] = useState<StudyAnalysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void examAttemptService
      .createStudyAnalysis(params.id)
      .then((loaded) => {
        setAnalysis(loaded);
        if (loaded.practiceSet?.status === "SUBMITTED") {
          setAnswers(
            Object.fromEntries(
              loaded.practiceSet.questions.map((question) => [
                question.id,
                question.selectedOptionIds ?? [],
              ]),
            ),
          );
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể phân tích kết quả học tập",
        ),
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  const practice = analysis?.practiceSet ?? null;
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

  if (loading) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-brand-100 bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <BrainCircuit className="size-7 animate-pulse" />
          </span>
          <h1 className="mt-5 text-xl font-black">Đang phân tích bài làm</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            AI đang xác định phần kiến thức còn yếu và đối chiếu với tài liệu
            giáo viên đã cung cấp.
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push("/student/review")}>
          <ArrowLeft className="size-4" /> Quay lại ôn tập
        </Button>
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
          <Sparkles className="size-3.5" /> Trợ giảng AI
        </span>
      </div>

      {error ? (
        <div className="mb-5">
          <ErrorPanel message={error} />
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-cyan-500 p-6 text-white shadow-xl shadow-brand-700/15 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center">
          <div>
            <p className="text-sm font-bold text-blue-100">
              {report.exam.subjectName} · {report.exam.className}
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Phân tích sau bài kiểm tra
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">
              {report.summary}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs text-blue-100">Độ chính xác</p>
              <p className="mt-1 text-3xl font-black">
                {report.performance.accuracy}%
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs text-blue-100">Câu đúng</p>
              <p className="mt-1 text-3xl font-black">
                {report.performance.correctCount}/
                {report.performance.totalQuestions}
              </p>
            </div>
          </div>
        </div>
      </section>

      {report.aiStatus === "FALLBACK" ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Hiện AI chưa tạo được phần tổng hợp chi tiết. Thống kê chủ đề và
            nguồn tài liệu vẫn được giữ nguyên; bộ câu hỏi ôn tập sẽ xuất hiện
            khi dịch vụ AI hoạt động lại.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-brand-700">
              <FileSearch className="size-5" />
            </span>
            <div>
              <h2 className="font-black">Kết quả theo chủ đề</h2>
              <p className="text-xs text-slate-500">Ưu tiên phần có tỷ lệ thấp</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {report.topicPerformance.map((topic) => (
              <div key={topic.topicName}>
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
        </aside>

        <div className="space-y-4">
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
      </div>

      <PracticeSection
        practice={practice}
        answers={answers}
        answeredCount={answeredCount}
        submitting={submitting}
        onChoose={choose}
        onSubmit={() => void submitPractice()}
      />
    </StudentShell>
  );
}

function PracticeSection({
  practice,
  answers,
  answeredCount,
  submitting,
  onChoose,
  onSubmit,
}: {
  practice: StudyPracticeSet | null;
  answers: Record<string, string[]>;
  answeredCount: number;
  submitting: boolean;
  onChoose: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
}) {
  if (!practice) return null;
  const submitted = practice.status === "SUBMITTED";
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
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {answeredCount}/{practice.totalQuestions} câu đã chọn
          </span>
        )}
      </div>

      <div className="mt-6 space-y-5">
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
                    disabled={submitted}
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
            ) : null}
          </article>
        ))}
      </div>

      {!submitted ? (
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
          <Button
            disabled={answeredCount < practice.totalQuestions || submitting}
            onClick={onSubmit}
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {submitting ? "Đang chấm bài..." : "Hoàn thành ôn tập"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
