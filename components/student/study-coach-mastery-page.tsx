"use client";

import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CircleHelp,
  LoaderCircle,
  RotateCcw,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { studyCoachService } from "@/lib/study-coach-api";
import {
  difficultyLabels,
  masteryLabels,
  masteryTones,
  studentError,
} from "@/lib/study-coach-view";
import type {
  ConceptMasteryState,
  ConceptMasteryView,
  StudyCoachLearningActivity,
} from "@/types/study-coach";

const EMPTY_ACTIVITY: StudyCoachLearningActivity = {
  flashcardReviewCount: 0,
  quizAnswerCount: 0,
  totalActivityCount: 0,
};

const filters: Array<{ value: ConceptMasteryState | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "STRONG", label: "Nắm rất vững" },
  { value: "PROFICIENT", label: "Nắm vững" },
  { value: "DEVELOPING", label: "Đang tiến bộ" },
  { value: "NEEDS_SUPPORT", label: "Cần ôn lại" },
  { value: "NEW", label: "Chưa đủ dữ liệu" },
];

export function StudyCoachMasteryPage() {
  const router = useRouter();
  const { materialId: documentId } = useParams<{ materialId: string }>();
  const [documentTitle, setDocumentTitle] = useState("");
  const [filter, setFilter] = useState<ConceptMasteryState | "ALL">("ALL");
  const [items, setItems] = useState<ConceptMasteryView[]>([]);
  const [activity, setActivity] = useState<StudyCoachLearningActivity>(EMPTY_ACTIVITY);
  const [minimumEvidence, setMinimumEvidence] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!documentId) {
      setItems([]);
      setActivity(EMPTY_ACTIVITY);
      setDocumentTitle("");
      setLoading(false);
      return;
    }
    try {
      const [result, material] = await Promise.all([
        studyCoachService.getMastery({ documentId }),
        studyCoachService.getMaterial(documentId).catch(() => null),
      ]);
      setItems(result.items);
      setActivity(result.activity ?? EMPTY_ACTIVITY);
      setMinimumEvidence(Math.max(1, result.policy?.minimumEvidenceRequired ?? 3));
      setDocumentTitle(material?.title ?? "");
    } catch (cause) {
      setError(studentError(cause, "Không thể tải tiến độ học tập."));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () => filter === "ALL" ? items : items.filter((item) => item.state === filter),
    [filter, items],
  );
  const evaluatedCount = items.filter((item) => item.evidenceCount > 0).length;
  const classifiedCount = items.filter((item) => item.state !== "NEW").length;
  const totalEvidence = items.reduce((sum, item) => sum + item.correctEvidence + item.incorrectEvidence, 0);
  const correctEvidence = items.reduce((sum, item) => sum + item.correctEvidence, 0);
  const quizAccuracy = totalEvidence > 0 ? Math.round((correctEvidence / totalEvidence) * 100) : null;
  const backHref = `/student/study-coach/materials/${encodeURIComponent(documentId)}`;
  const quizHref = `/student/review/quiz?documentId=${encodeURIComponent(documentId)}`;

  return (
    <StudentShell>
      <div data-testid="mastery-overview">
        <header className="rounded-3xl bg-gradient-to-br from-brand-700 to-blue-500 p-6 text-white shadow-card sm:p-8">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-300/40"
          >
            <ArrowLeft className="size-4" /> Quay lại tài liệu
          </button>
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-blue-100">Tiến độ của bạn</p>
          <h1 className="mt-1 text-3xl font-black">Mức độ nắm vững kiến thức</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">
            {documentTitle
              ? `Kết quả học với tài liệu “${documentTitle}”.`
              : "Xem kết quả Quiz và mức độ nắm vững theo từng khái niệm."}
          </p>
        </header>

        {loading ? (
          <LoadingPanel />
        ) : error ? (
          <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void load()}>
              <RotateCcw className="size-4" /> Thử lại
            </Button>
          </section>
        ) : !documentId ? (
          <section className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div>
              <Target className="mx-auto size-8 text-brand-500" />
              <h2 className="mt-4 text-lg font-black text-slate-950">Chọn tài liệu để xem năng lực</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Năng lực được theo dõi riêng cho từng tài liệu để kết quả không bị trộn lẫn.</p>
              <Button className="mt-5" onClick={() => router.push("/student/study-coach#mastery-by-document")}>Xem danh sách tài liệu</Button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Tổng quan năng lực">
              <OverviewMetric
                icon={BarChart3}
                label="Độ chính xác Quiz"
                value={quizAccuracy === null ? "Chưa có" : `${quizAccuracy}%`}
                detail={quizAccuracy === null ? "Làm Quiz để bắt đầu đánh giá" : "Tính từ các câu đã trả lời"}
              />
              <OverviewMetric
                icon={Target}
                label="Khái niệm đã đánh giá"
                value={`${evaluatedCount}/${items.length}`}
                detail="Đã có ít nhất một kết quả Quiz"
              />
              <OverviewMetric
                icon={BookOpenCheck}
                label="Đã đủ dữ liệu"
                value={`${classifiedCount}/${items.length}`}
                detail={`Cần ít nhất ${minimumEvidence} lượt đánh giá mỗi khái niệm`}
              />
            </section>

            <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <CircleHelp className="mt-0.5 size-5 shrink-0 text-brand-700" />
                <div>
                  <h2 className="font-black text-slate-950">Study Coach đánh giá như thế nào?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Mỗi câu Quiz đúng hoặc sai sẽ bổ sung dữ liệu cho khái niệm liên quan. Một khái niệm cần ít nhất {minimumEvidence} lượt đánh giá để được xếp vào mức Cần ôn lại, Đang tiến bộ hoặc Nắm vững. Flashcard giúp ghi nhớ và sắp lịch ôn, nhưng không được tính như một câu Quiz đúng hoặc sai.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-5" aria-label="Hoạt động học tập">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-brand-600">Hoạt động đã ghi nhận</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Những gì bạn đã học</h2>
                </div>
                <p className="text-sm font-bold text-slate-500">{activity.totalActivityCount} hoạt động</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ActivityMetric label="Lần ôn Flashcard" value={activity.flashcardReviewCount} />
                <ActivityMetric label="Câu Quiz đã trả lời" value={activity.quizAnswerCount} />
              </div>
            </section>

            <section className="mt-6">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo mức độ nắm vững">
                {filters.map((item) => {
                  const count = item.value === "ALL"
                    ? items.length
                    : items.filter((concept) => concept.state === item.value).length;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={filter === item.value}
                      onClick={() => setFilter(item.value)}
                      className={`min-h-11 rounded-full border px-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                        filter === item.value
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {item.label} <span className="ml-1 opacity-75">{count}</span>
                    </button>
                  );
                })}
              </div>

              {visibleItems.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.map((item) => (
                    <ConceptCard key={item.conceptId} item={item} minimumEvidence={minimumEvidence} />
                  ))}
                </div>
              ) : (
                <EmptyFilter
                  filter={filter}
                  hasConcepts={items.length > 0}
                  onPractice={() => router.push(quizHref)}
                />
              )}
            </section>
          </>
        )}
      </div>
    </StudentShell>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <Icon className="size-5 text-brand-600" />
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function ActivityMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-2xl font-black text-brand-700">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </article>
  );
}

function ConceptCard({ item, minimumEvidence }: { item: ConceptMasteryView; minimumEvidence: number }) {
  const hasEvidence = item.evidenceCount > 0;
  const classified = item.state !== "NEW";
  const masteryPercent = classified ? Math.round(item.masteryScore * 100) : null;
  const evidenceProgress = Math.min(100, Math.round((item.evidenceCount / minimumEvidence) * 100));
  const accuracy = hasEvidence
    ? Math.round((item.correctEvidence / (item.correctEvidence + item.incorrectEvidence)) * 100)
    : null;
  const statusLabel = !hasEvidence
    ? "Chưa bắt đầu"
    : classified
      ? masteryLabels[item.state]
      : "Đang đánh giá";

  return (
    <article data-testid="mastery-concept" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-slate-950">{item.conceptName}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {hasEvidence
              ? `${formatEvidence(item.evidenceCount)} lượt đánh giá · đúng ${accuracy}%`
              : "Chưa có kết quả Quiz"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${masteryTones[item.state]}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-500">
          {classified ? "Mức nắm vững" : "Dữ liệu đánh giá"}
        </span>
        <span className="font-black text-slate-950">
          {classified ? `${masteryPercent}%` : `${formatEvidence(item.evidenceCount)}/${minimumEvidence}`}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={classified ? `Mức nắm vững ${item.conceptName}` : `Dữ liệu đánh giá ${item.conceptName}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={classified ? masteryPercent ?? 0 : evidenceProgress}
      >
        <div
          className={`h-full rounded-full ${classified ? "bg-brand-600" : "bg-amber-400"}`}
          style={{ width: `${classified ? masteryPercent : evidenceProgress}%` }}
        />
      </div>
      {!classified ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {hasEvidence
            ? `Cần thêm ${formatEvidence(Math.max(0, minimumEvidence - item.evidenceCount))} lượt đánh giá để xác định mức độ.`
            : "Hãy trả lời Quiz liên quan đến khái niệm này."}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Mức bài phù hợp tiếp theo</span>
        <span className="font-black text-slate-900">{difficultyLabels[item.targetDifficulty]}</span>
      </div>
    </article>
  );
}

function EmptyFilter({
  filter,
  hasConcepts,
  onPractice,
}: {
  filter: ConceptMasteryState | "ALL";
  hasConcepts: boolean;
  onPractice: () => void;
}) {
  const label = filters.find((item) => item.value === filter)?.label ?? "mức này";
  return (
    <section className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div>
        <Target className="mx-auto size-8 text-slate-300" />
        <h2 className="mt-4 text-lg font-black text-slate-950">
          {hasConcepts ? `Chưa có khái niệm ở mức “${label}”` : "Chưa có khái niệm để đánh giá"}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          {hasConcepts
            ? "Tiếp tục làm Quiz để bổ sung kết quả cho từng khái niệm. Khi đủ dữ liệu, Study Coach sẽ tự cập nhật nhóm phù hợp."
            : "Hãy chọn một tài liệu đã xử lý thành công rồi bắt đầu học."}
        </p>
        {hasConcepts ? <Button className="mt-5" onClick={onPractice}>Tiếp tục làm Quiz</Button> : null}
      </div>
    </section>
  );
}

function LoadingPanel() {
  return (
    <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white" aria-live="polite">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-7 animate-spin text-brand-600" />
        <p className="mt-3 text-sm font-bold text-slate-500">Đang tổng hợp tiến độ...</p>
      </div>
    </div>
  );
}

function formatEvidence(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}
