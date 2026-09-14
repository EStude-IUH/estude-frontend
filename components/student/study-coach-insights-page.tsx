"use client";

import { ArrowLeft, ArrowRight, BarChart3, BookOpenCheck, BrainCircuit, Layers, Lightbulb, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-control";
import { studyCoachService } from "@/lib/study-coach-api";
import { actionHref, actionLabels, difficultyLabels, isInsightDisabled, masteryLabels, studentError } from "@/lib/study-coach-view";
import type { ConceptMasteryResult, InsightScope, LearningInsight, StudyCoachMaterial } from "@/types/study-coach";

export function StudyCoachInsightsPage() {
  const router = useRouter();
  const generatingRef = useRef(false);
  const initialDocumentId = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("documentId") ?? "";
  const [scope, setScope] = useState<InsightScope>(initialDocumentId ? "DOCUMENT" : "STUDENT");
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [materials, setMaterials] = useState<StudyCoachMaterial[]>([]);
  const [progress, setProgress] = useState<ConceptMasteryResult | null>(null);
  const [insight, setInsight] = useState<LearningInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState("");
  const documents = useMemo(() => materials.filter((material) => material.readyForStudy), [materials]);
  const selectedMaterial = documents.find((material) => material.id === documentId);
  const backDocumentId = initialDocumentId || (scope === "DOCUMENT" ? documentId : "");
  const backHref = backDocumentId
    ? `/student/study-coach/materials/${encodeURIComponent(backDocumentId)}`
    : "/student/study-coach";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const capabilities = await studyCoachService.getCapabilities();
      if (!capabilities.insights.enabled) { setDisabled(true); setInsight(null); return; }
      setDisabled(false);
      const materialResult = capabilities.materials.enabled
        ? await studyCoachService.getMaterials(1, 100)
        : { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } };
      setMaterials(materialResult.items);
      const selectedDocument = scope === "DOCUMENT" ? documentId || materialResult.items.find((item) => item.readyForStudy)?.id : undefined;
      if (scope === "DOCUMENT" && !selectedDocument) { setInsight(null); setProgress(null); return; }
      if (scope === "DOCUMENT" && !documentId && selectedDocument) setDocumentId(selectedDocument);
      const [result, currentProgress] = await Promise.all([
        studyCoachService.getInsights({ scope, documentId: selectedDocument, language }),
        capabilities.mastery.enabled
          ? studyCoachService.getMastery(selectedDocument ? { documentId: selectedDocument } : {})
          : Promise.resolve(null),
      ]);
      setInsight(result.items[0] ?? null);
      setProgress(currentProgress);
    } catch (cause) { setError(studentError(cause, "Không thể tải phân tích học tập.")); }
    finally { setLoading(false); }
  }, [documentId, language, scope]);
  useEffect(() => { void load(); }, [load]);

  async function generate() {
    if (generatingRef.current || disabled || (scope === "DOCUMENT" && !documentId)) return;
    generatingRef.current = true; setGenerating(true); setError("");
    try {
      const result = await studyCoachService.generateInsight({ scope, documentId: scope === "DOCUMENT" ? documentId : undefined, language });
      setInsight(result);
    } catch (cause) {
      if (isInsightDisabled(cause)) setDisabled(true);
      else setError(studentError(cause, "Không thể tạo phân tích học tập."));
    } finally { generatingRef.current = false; setGenerating(false); }
  }

  return <StudentShell><div>
    <header className="rounded-3xl bg-gradient-to-br from-violet-700 to-brand-600 p-6 text-white shadow-card sm:p-8">
      <button type="button" onClick={() => router.push(backHref)} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-50"><ArrowLeft className="size-4" /> {backDocumentId ? "Quay lại tài liệu" : "Study Coach"}</button>
      <p className="mt-4 text-xs font-black uppercase tracking-wider text-violet-100">Phân tích từ hoạt động học</p><h1 className="mt-1 text-3xl font-black">Hiểu rõ tiến trình của bạn</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-50">Study Coach chỉ đưa ra nhận xét khi có bằng chứng từ bài luyện và hoạt động ôn tập của bạn.</p>
    </header>
    <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      {initialDocumentId ? <div className="rounded-xl bg-violet-50 px-4 py-3 sm:col-span-2"><p className="text-xs font-bold text-violet-600">Đang phân tích riêng theo tài liệu</p><p className="mt-1 truncate font-black text-slate-950">{selectedMaterial?.title ?? "Tài liệu đã chọn"}</p></div> : <><Select label="Phạm vi" value={scope} onChange={(event) => { setScope(event.target.value as InsightScope); setInsight(null); }}><option value="STUDENT">Tổng quan tất cả tài liệu</option><option value="DOCUMENT">Theo một tài liệu</option></Select>{scope === "DOCUMENT" ? <Select label="Tài liệu" value={documentId} onChange={(event) => { setDocumentId(event.target.value); setInsight(null); }}><option value="">Chọn tài liệu</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</Select> : <div />}</>}
      <Select label="Ngôn ngữ phân tích" value={language} onChange={(event) => { setLanguage(event.target.value as "vi" | "en"); setInsight(null); }}><option value="vi">Tiếng Việt</option><option value="en">English</option></Select>
    </section>
    {loading ? <section className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white" aria-live="polite"><div className="text-center"><LoaderCircle className="mx-auto size-7 animate-spin text-violet-600" /><p className="mt-3 text-sm font-bold text-slate-500">Đang tải phân tích...</p></div></section>
      : error ? <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert"><p className="text-sm font-semibold text-rose-700">{error}</p><Button variant="outline" className="mt-4" onClick={() => void load()}><RotateCcw className="size-4" /> Tải lại</Button></section>
      : disabled ? <State title="Phân tích học tập đang tạm ngừng" detail="Bạn vẫn có thể học Flashcard, làm Quiz và xem tiến độ của mình." />
      : scope === "DOCUMENT" && !documentId ? <State title="Hãy chọn một tài liệu" detail="Mỗi tài liệu có phân tích riêng để kết quả không bị trộn lẫn." />
      : !insight || insight.source === "INSUFFICIENT_DATA" ? <InsightReadiness progress={progress} insight={insight} documentId={scope === "DOCUMENT" ? documentId : undefined} generating={generating} onGenerate={generate} />
      : <InsightView insight={insight} onGenerate={generate} generating={generating} />}
  </div></StudentShell>;
}

function InsightReadiness({
  progress,
  insight,
  documentId,
  generating,
  onGenerate,
}: {
  progress: ConceptMasteryResult | null;
  insight: LearningInsight | null;
  documentId?: string;
  generating: boolean;
  onGenerate: () => Promise<void>;
}) {
  const router = useRouter();
  const concepts = progress?.items ?? insight?.mastery ?? [];
  const quizCount = progress?.activity.quizAnswerCount ?? insight?.quiz.answeredCount ?? 0;
  const reviewCount = progress?.activity.flashcardReviewCount ?? insight?.flashcards.reviewCount ?? 0;
  const minimumEvidence = progress?.policy.minimumEvidenceRequired ?? 3;
  const evaluatedCount = concepts.filter((concept) => concept.evidenceCount > 0).length;
  const classifiedCount = concepts.filter((concept) => concept.state !== "NEW").length;
  const hasCurrentEvidence = quizCount > 0 || reviewCount > 0 || evaluatedCount > 0;
  const scopedQuery = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";

  return <div className="mt-5 space-y-4" data-testid="insight-readiness">
    <section className={`rounded-3xl border p-6 ${hasCurrentEvidence ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start gap-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-white ${hasCurrentEvidence ? "text-emerald-700" : "text-amber-700"}`}><ShieldCheck className="size-6" /></span>
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Đánh giá dựa trên bằng chứng</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{hasCurrentEvidence ? "Đã có dữ liệu để tạo phân tích ban đầu" : "Chưa đủ dữ liệu để đánh giá khách quan"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{hasCurrentEvidence ? "Study Coach đã ghi nhận hoạt động mới. Phân tích ban đầu có thể được tạo ngay; kết quả sẽ chính xác hơn khi nhiều khái niệm có đủ bằng chứng." : "Study Coach chưa kết luận điểm mạnh hoặc điểm cần củng cố khi bạn chưa có kết quả học tập. Hãy hoàn thành các bước bên dưới trước."}</p>
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Dữ liệu hiện có">
      <ReadinessMetric icon={BrainCircuit} label="Câu bài luyện đã trả lời" value={quizCount} detail={quizCount ? "Đã có dữ liệu đúng/sai" : "Cần để đánh giá kiến thức"} />
      <ReadinessMetric icon={Layers} label="Lần ôn thẻ ghi nhớ" value={reviewCount} detail={reviewCount ? "Đã ghi nhận mức độ ghi nhớ" : "Giúp bổ sung thói quen ôn tập"} />
      <ReadinessMetric icon={Target} label="Khái niệm đủ bằng chứng" value={`${classifiedCount}/${concepts.length}`} detail={`Mỗi khái niệm cần ít nhất ${minimumEvidence} lượt đánh giá`} />
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><BookOpenCheck className="size-5 text-brand-600" /> Làm gì để nhận được phân tích đáng tin cậy?</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <GuideStep number={1} title="Làm bài luyện" detail="Trả lời câu hỏi để hệ thống có bằng chứng đúng/sai theo khái niệm." done={quizCount > 0} />
        <GuideStep number={2} title="Bổ sung đủ lượt" detail={`Luyện lại để mỗi khái niệm có ít nhất ${minimumEvidence} lượt đánh giá.`} done={classifiedCount > 0} />
        <GuideStep number={3} title="Ôn thẻ ghi nhớ" detail="Tự đánh giá mức độ nhớ để hệ thống sắp lịch ôn phù hợp." done={reviewCount > 0} />
      </div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Kết quả bài luyện là cơ sở để nhận biết điểm mạnh và phần cần củng cố. Tự đánh giá Flashcard chỉ hỗ trợ lịch ôn, không được xem là một câu trả lời đúng hoặc sai.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => router.push(`/student/review/quiz${scopedQuery}`)}><BrainCircuit className="size-4" /> Làm bài luyện</Button>
        <Button variant="outline" onClick={() => router.push(`/student/review/flashcards${scopedQuery}`)}><Layers className="size-4" /> Ôn thẻ ghi nhớ</Button>
        {hasCurrentEvidence ? <Button data-testid="insight-generate" variant="secondary" disabled={generating} onClick={() => void onGenerate()}>{generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {generating ? "Đang tạo phân tích..." : "Tạo phân tích từ dữ liệu hiện có"}</Button> : null}
      </div>
    </section>
  </div>;
}

function ReadinessMetric({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: number | string; detail: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-500">{label}</p><Icon className="size-5 text-brand-600" /></div><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></article>;
}

function GuideStep({ number, title, detail, done }: { number: number; title: string; detail: string; done: boolean }) {
  return <article className={`rounded-2xl border p-4 ${done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${done ? "bg-emerald-600 text-white" : "bg-white text-brand-700"}`}>{done ? "✓" : number}</span><h3 className="font-black text-slate-950">{title}</h3></div><p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p></article>;
}

function InsightView({ insight, onGenerate, generating }: { insight: LearningInsight; onGenerate: () => Promise<void>; generating: boolean }) {
  const router = useRouter();
  if (insight.status === "PROCESSING") return <State title="Study Coach đang tạo phân tích" detail="Bạn có thể quay lại sau để xem kết quả." />;
  return <div className="mt-5 space-y-4">
    <section data-testid="insight-summary" className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black text-violet-950">{insight.scope === "DOCUMENT" ? "Phân tích theo tài liệu" : "Tổng quan quá trình học"}</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">{insight.isFresh ? "Dựa trên dữ liệu mới nhất" : "Có hoạt động mới cần cập nhật"}</span></div><p className="mt-3 text-sm leading-6 text-violet-900">{insight.summary}</p>{insight.source === "FALLBACK" ? <p className="mt-3 text-xs font-bold text-amber-700">Đây là gợi ý tạm thời khi phần diễn giải AI chưa khả dụng.</p> : null}</section>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Bằng chứng dùng để phân tích">
      <ReadinessMetric icon={BarChart3} label="Độ chính xác bài luyện" value={insight.quiz.accuracy === null ? "Chưa có" : `${Math.round(insight.quiz.accuracy * 100)}%`} detail={`${insight.quiz.answeredCount} câu đã trả lời`} />
      <ReadinessMetric icon={Layers} label="Lần ôn thẻ ghi nhớ" value={insight.flashcards.reviewCount} detail="Hoạt động ôn đã ghi nhận" />
      <ReadinessMetric icon={Target} label="Khái niệm đã đánh giá" value={insight.mastery.filter((item) => item.evidenceCount > 0).length} detail={`Trong ${insight.mastery.length} khái niệm được phân tích`} />
    </section>
    <InsightGroup title="Điểm mạnh" empty="Chưa có điểm mạnh đủ bằng chứng." items={insight.strengths} testId="insight-strength" />
    <InsightGroup title="Cần củng cố" empty="Hiện chưa có khái niệm nào cần ưu tiên củng cố." items={insight.weakAreas} testId="insight-weak-area" />
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-black"><TrendingUp className="size-5 text-brand-600" /> Tiến triển</h2>{insight.progress.length ? <div className="mt-4 grid gap-3">{insight.progress.map((item) => <article key={item.conceptId} data-testid="insight-progress" className="rounded-xl bg-slate-50 p-4"><p className="font-black">{item.conceptName} · {directionLabels[item.direction]}</p><p className="mt-1 text-sm text-slate-500">{item.reason}</p></article>)}</div> : <p className="mt-3 text-sm text-slate-500">Hãy học thêm để Study Coach có thể nhận ra xu hướng tiến bộ của bạn.</p>}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-black"><Lightbulb className="size-5 text-violet-600" /> Hành động tiếp theo</h2>{insight.nextActions.length ? <div className="mt-4 grid gap-3">{insight.nextActions.map((item) => <article key={`${item.priority}-${item.conceptId}`} data-testid="insight-next-action" className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="font-black">{item.priority}. {actionLabels[item.actionType]} · {item.conceptName}</p><p className="mt-1 text-sm text-slate-500">{item.reason}</p><p className="mt-2 text-xs font-bold text-brand-700">{masteryLabels[item.state]} · Mức bài {difficultyLabels[item.targetDifficulty]}</p></div><Button onClick={() => router.push(actionHref(item.actionType, insight.documentId ?? undefined))}>Tiếp tục <ArrowRight className="size-4" /></Button></article>)}</div> : <p className="mt-3 text-sm text-slate-500">Chưa có đủ bằng chứng để ưu tiên một hành động cụ thể.</p>}</section>
    <Button data-testid="insight-generate" variant="outline" disabled={generating || insight.isFresh} onClick={() => void onGenerate()}>{generating ? "Đang cập nhật..." : insight.isFresh ? "Phân tích đang dùng dữ liệu mới nhất" : "Cập nhật bằng dữ liệu học mới"}</Button>
  </div>;
}

function InsightGroup({ title, empty, items, testId }: { title: string; empty: string; items: LearningInsight["strengths"] | LearningInsight["weakAreas"]; testId: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">{title}</h2>{items.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <article key={item.conceptId} data-testid={testId} className="rounded-xl bg-slate-50 p-4"><p className="font-black">{item.conceptName}</p><p className="mt-1 text-sm leading-6 text-slate-500">{item.reason}</p></article>)}</div> : <p className="mt-3 text-sm text-slate-500">{empty}</p>}</section>;
}

function State({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) { return <section className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-6 text-center"><div><Sparkles className="mx-auto size-8 text-violet-400" /><h2 className="mt-4 text-lg font-black">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{detail}</p>{action ? <div className="mt-5">{action}</div> : null}</div></section>; }

const directionLabels = {
  IMPROVING: "Đang tiến bộ",
  STABLE: "Duy trì ổn định",
  DECLINING: "Cần chú ý thêm",
} as const;
