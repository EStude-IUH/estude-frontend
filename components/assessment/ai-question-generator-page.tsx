"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  FileSearch,
  Info,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { academicDataService, aiQuestionService, aiQuestionSettingsService } from "@/lib/assessment-api";
import type {
  Difficulty,
  DifficultyLevelDefinition,
  GenerateAiQuestionsInput,
  GeneratedQuestion,
  LearningMaterial,
  Subject,
  Topic,
  TeacherDifficultySettings,
} from "@/types/assessment";

const builtInDifficultyLevels: DifficultyLevelDefinition[] = [
  { code: "EASY", label: "Dễ", description: "Kiểm tra khả năng ghi nhớ, nhận biết và hiểu trực tiếp kiến thức trong tài liệu." },
  { code: "MEDIUM", label: "Trung bình", description: "Yêu cầu áp dụng kiến thức hoặc liên kết hai ý có liên quan trong tài liệu." },
  { code: "HARD", label: "Khó", description: "Yêu cầu phân tích, so sánh hoặc suy luận từ nhiều thông tin trong tài liệu." },
  { code: "VERY_HARD", label: "Rất khó", description: "Yêu cầu tổng hợp nhiều phần, đánh giá tình huống và tránh các phương án nhiễu tinh vi." },
];

const initialForm: GenerateAiQuestionsInput = {
  materialId: "",
  sourceFocus: "",
  questionType: "SINGLE_CHOICE",
  difficulty: "MEDIUM",
  quantity: 5,
  includeExplanation: true,
  defaultPoints: 1,
};

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function createDifficultyDraft(settings: TeacherDifficultySettings): DifficultyLevelDefinition[] {
  return settings.effectiveLevels.map((effective) => {
    const custom = settings.customLevels?.find((level) => level.code === effective.code);
    return {
      code: effective.code,
      label: custom?.label ?? "",
      description: custom?.description ?? "",
    };
  });
}

export function AiQuestionGeneratorPage() {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState(initialForm);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [difficultySettings, setDifficultySettings] = useState<TeacherDifficultySettings | null>(null);
  const [difficultyDraft, setDifficultyDraft] = useState<DifficultyLevelDefinition[]>([]);
  const [customizingDifficulty, setCustomizingDifficulty] = useState(false);
  const [savingDifficulty, setSavingDifficulty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      academicDataService.getMaterialLibrary(),
      academicDataService.getTeacherAssignedClasses(),
      aiQuestionSettingsService.getMine(),
    ]).then(([materialItems, assignedClasses, teacherSettings]) => {
      const pdfs = materialItems.filter((item) =>
        item.mimeType === "application/pdf" || item.originalName.toLowerCase().endsWith(".pdf"),
      );
      const subjectItems = [...new Map(
        assignedClasses.flatMap((item) => item.subjects).map((subject) => [subject.id, subject]),
      ).values()].map((subject) => ({ ...subject, description: "", isActive: true }));
      setMaterials(pdfs);
      setSubjects(subjectItems);
      setDifficultySettings(teacherSettings);
      setDifficultyDraft(createDifficultyDraft(teacherSettings));
      setForm((current) => ({
        ...current,
        materialId: current.materialId || pdfs[0]?.id || "",
        difficulty: teacherSettings.effectiveLevels.some((level) => level.code === current.difficulty)
          ? current.difficulty
          : teacherSettings.effectiveLevels[0]?.code ?? "MEDIUM",
      }));
    }).catch((cause) => {
      setError(errorMessage(cause, "Không thể tải dữ liệu tạo câu hỏi"));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.subjectId) {
      setTopics([]);
      setForm((current) => current.topicId ? { ...current, topicId: undefined } : current);
      return;
    }
    academicDataService.getTopics(form.subjectId).then((items) => {
      setTopics(items);
      setForm((current) => ({
        ...current,
        topicId: items.some((item) => item.id === current.topicId)
          ? current.topicId
          : undefined,
      }));
    }).catch((cause) => setError(errorMessage(cause, "Không thể tải chủ đề")));
  }, [form.subjectId]);

  function update<K extends keyof GenerateAiQuestionsInput>(
    key: K,
    value: GenerateAiQuestionsInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.materialId) {
      setError("Thư viện chưa có tài liệu PDF để tạo câu hỏi.");
      return;
    }
    setGenerating(true);
    setQuestions([]);
    try {
      setQuestions(await aiQuestionService.generate(form));
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tạo câu hỏi bằng AI"));
    } finally {
      setGenerating(false);
    }
  }

  function changeDifficultyLevelCount(count: 3 | 4) {
    setDifficultyDraft((current) => count === 3
      ? current.filter((level) => level.code !== "VERY_HARD")
      : builtInDifficultyLevels.map((fallback) =>
        current.find((level) => level.code === fallback.code)
        ?? { code: fallback.code, label: "", description: "" },
      ));
  }

  function updateDifficultyDraft(
    code: Difficulty,
    patch: Partial<DifficultyLevelDefinition>,
  ) {
    setDifficultyDraft((current) => current.map((level) =>
      level.code === code ? { ...level, ...patch } : level,
    ));
  }

  async function saveDifficultySettings() {
    setSavingDifficulty(true);
    setError("");
    try {
      const result = await aiQuestionSettingsService.updateMine(difficultyDraft);
      setDifficultySettings(result);
      setDifficultyDraft(createDifficultyDraft(result));
      setCustomizingDifficulty(false);
      setForm((current) => ({
        ...current,
        difficulty: result.effectiveLevels.some((level) => level.code === current.difficulty)
          ? current.difficulty
          : result.effectiveLevels[0].code,
      }));
    } catch (cause) {
      setError(errorMessage(cause, "Không thể lưu cấu hình độ khó"));
    } finally {
      setSavingDifficulty(false);
    }
  }

  function replaceQuestion(updated: GeneratedQuestion) {
    setQuestions((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  if (loading) return <AssessmentShell><LoadingPanel /></AssessmentShell>;
  const approvedCount = questions.filter((item) => item.status === "APPROVED").length;
  const activeDifficultyLevels = difficultySettings?.effectiveLevels
    ?? builtInDifficultyLevels.slice(0, 3);

  return (
    <AssessmentShell>
      <PageHeading
        eyebrow="RAG · Gemini"
        title="Tạo câu hỏi tự động"
        description="Chọn PDF từ thư viện của bạn. AI chỉ dùng nội dung trong tài liệu và mọi câu đều cần được duyệt trước khi vào ngân hàng."
        action={<Link href="/teacher/question-bank"><Button variant="ghost"><ArrowLeft className="size-4" />Ngân hàng câu hỏi</Button></Link>}
      />
      {error ? <div className="mb-5"><ErrorPanel message={error} /></div> : null}
      <div className="grid items-start gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <form onSubmit={(event) => void generate(event)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card xl:sticky xl:top-20">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="size-5" /></span>
            <div><h2 className="font-black text-slate-900">Cấu hình bộ câu hỏi</h2><p className="mt-0.5 text-xs text-slate-500">RAG tìm đúng đoạn liên quan trong PDF</p></div>
          </div>
          <div className="grid gap-4">
            <Field label="Tài liệu nguồn">
              <select required value={form.materialId} onChange={(event) => update("materialId", event.target.value)} className="field-control">
                <option value="">Chọn PDF trong thư viện...</option>
                {materials.map((material) => <option key={material.id} value={material.id}>{material.originalName}</option>)}
              </select>
              {!materials.length ? <Link href="/teacher/materials" className="text-xs font-bold text-brand-600 hover:underline">+ Tải PDF lên thư viện trước</Link> : null}
            </Field>
            <Field label="Nội dung/mục cần tạo câu hỏi (không bắt buộc)">
              <input value={form.sourceFocus ?? ""} onChange={(event) => update("sourceFocus", event.target.value)} maxLength={200} placeholder="Ví dụ: Chuẩn hóa dữ liệu, chương 3, Linked List..." className="field-control" />
              <span className="text-xs font-normal leading-5 text-slate-400">Nhập mục cụ thể để RAG ưu tiên đúng phần đó; bỏ trống để tự tìm nội dung trọng tâm.</span>
            </Field>
            <Field label="Môn học (không bắt buộc)">
              <select value={form.subjectId ?? ""} onChange={(event) => update("subjectId", event.target.value || undefined)} className="field-control">
                <option value="">Không phân loại môn học</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </Field>
            <Field label="Chủ đề gợi ý (không bắt buộc)">
              <select disabled={!form.subjectId} value={form.topicId ?? ""} onChange={(event) => update("topicId", event.target.value || undefined)} className="field-control disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">Tự xác định từ tài liệu</option>
                {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </Field>
            <Field label="Loại câu hỏi">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["SINGLE_CHOICE", "Trắc nghiệm"],
                  ["TRUE_FALSE", "Đúng / Sai"],
                ] as const).map(([value, label]) => <ChoiceButton key={value} active={form.questionType === value} onClick={() => update("questionType", value)}>{label}</ChoiceButton>)}
              </div>
            </Field>
            <Field label="Độ khó">
              <div className="grid grid-cols-2 gap-2">
                {activeDifficultyLevels.map((level) => <ChoiceButton key={level.code} active={form.difficulty === level.code} onClick={() => update("difficulty", level.code)}>{level.label}</ChoiceButton>)}
              </div>
              <span className="text-xs font-normal leading-5 text-slate-400">{activeDifficultyLevels.find((level) => level.code === form.difficulty)?.description}</span>
              <button type="button" onClick={() => setCustomizingDifficulty((current) => !current)} className="flex w-fit items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline"><Settings2 className="size-3.5" />Tùy chỉnh 3–4 mức độ</button>
            </Field>
            {customizingDifficulty && difficultySettings ? <TeacherDifficultyEditor settings={difficultySettings} levels={difficultyDraft} saving={savingDifficulty} onCountChange={changeDifficultyLevelCount} onChange={updateDifficultyDraft} onSave={() => void saveDifficultySettings()} onCancel={() => setCustomizingDifficulty(false)} /> : null}
            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-sm font-bold text-slate-700">Số lượng</label><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-700">{form.quantity}</span></div>
              <input type="range" min={1} max={20} value={form.quantity} onChange={(event) => update("quantity", Number(event.target.value))} className="w-full accent-brand-600" />
            </div>
            <Field label="Điểm mặc định">
              <input type="number" min={0} step={0.25} value={form.defaultPoints} onChange={(event) => update("defaultPoints", Number(event.target.value))} className="field-control" />
            </Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3.5">
              <input type="checkbox" checked={form.includeExplanation} onChange={(event) => update("includeExplanation", event.target.checked)} className="size-4 accent-brand-600" />
              <span><b className="block text-sm text-slate-700">Sinh lời giải chi tiết</b><small className="text-xs text-slate-400">Giúp kiểm tra đáp án trước khi duyệt</small></span>
            </label>
            <Button type="submit" disabled={generating || !materials.length} className="w-full">
              {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {generating ? "Gemini đang tạo..." : "Tạo câu hỏi"}
            </Button>
          </div>
          <div className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><Info className="mt-0.5 size-4 shrink-0" /><span>Lần đầu dùng một PDF sẽ lâu hơn vì hệ thống cần trích xuất, chia đoạn và tạo embedding.</span></div>
        </form>

        <section className="min-w-0">
          {generating ? (
            <div className="grid min-h-[570px] place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card"><div><LoaderCircle className="mx-auto size-9 animate-spin text-violet-600" /><p className="mt-4 font-black text-slate-800">Gemini đang tạo bộ câu hỏi...</p><p className="mt-2 text-sm text-slate-500">Đang truy xuất ngữ cảnh và kiểm tra kết quả có cấu trúc.</p></div></div>
          ) : questions.length ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div><p className="font-black text-slate-900">Kết quả kiểm duyệt</p><p className="mt-1 text-xs text-slate-500">{questions.length} câu · {approvedCount} đã vào ngân hàng</p></div>
                {approvedCount ? <Link href="/teacher/question-bank"><Button variant="secondary" size="sm"><Check className="size-4" />Xem ngân hàng</Button></Link> : null}
              </div>
              {questions.map((question, index) => <GeneratedQuestionCard key={question.id} question={question} index={index} difficultyLevels={activeDifficultyLevels} onReplace={replaceQuestion} onError={setError} />)}
            </div>
          ) : (
            <div className="flex min-h-[570px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-card">
              <span className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 text-violet-600"><BrainCircuit className="size-9" /></span>
              <h2 className="mt-6 text-xl font-black text-slate-900">Sẵn sàng tạo câu hỏi</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Chọn tài liệu và cấu hình bên trái. Hệ thống sẽ tìm các đoạn liên quan rồi sinh câu hỏi có dẫn nguồn theo trang.</p>
              <div className="mt-7 grid w-full max-w-md grid-cols-3 gap-2 text-xs font-bold text-slate-500"><span className="rounded-xl bg-slate-50 p-3"><FileSearch className="mx-auto mb-2 size-5 text-sky-500" />Vector Search</span><span className="rounded-xl bg-slate-50 p-3"><BrainCircuit className="mx-auto mb-2 size-5 text-violet-500" />Gemini AI</span><span className="rounded-xl bg-slate-50 p-3"><Check className="mx-auto mb-2 size-5 text-emerald-500" />Giáo viên duyệt</span></div>
            </div>
          )}
        </section>
      </div>
      <style jsx global>{`.field-control { height: 2.75rem; width: 100%; border-radius: 0.75rem; border: 1px solid rgb(226 232 240); background: white; padding: 0 0.75rem; font-size: 0.875rem; outline: none; } .field-control:focus { border-color: rgb(59 130 246); box-shadow: 0 0 0 4px rgb(239 246 255); }`}</style>
    </AssessmentShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}{children}</label>;
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${active ? "border-brand-500 bg-blue-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{children}</button>;
}

function TeacherDifficultyEditor({
  settings,
  levels,
  saving,
  onCountChange,
  onChange,
  onSave,
  onCancel,
}: {
  settings: TeacherDifficultySettings;
  levels: DifficultyLevelDefinition[];
  saving: boolean;
  onCountChange: (count: 3 | 4) => void;
  onChange: (code: Difficulty, patch: Partial<DifficultyLevelDefinition>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function fallbackFor(code: Difficulty) {
    return settings.systemLevels.find((level) => level.code === code)
      ?? builtInDifficultyLevels.find((level) => level.code === code)!;
  }

  return <div className="grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-800">Mức độ riêng của bạn</p><p className="mt-1 text-xs text-slate-500">Ô trống sẽ dùng giá trị mặc định của Admin.</p></div><div className="flex gap-1">{([3, 4] as const).map((count) => <button key={count} type="button" onClick={() => onCountChange(count)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black ${levels.length === count ? "bg-violet-600 text-white" : "bg-white text-slate-500"}`}>{count} mức</button>)}</div></div>
    {levels.map((level, index) => { const fallback = fallbackFor(level.code); return <div key={level.code} className="grid gap-2 rounded-xl border border-violet-100 bg-white p-3"><p className="text-xs font-black uppercase tracking-wide text-violet-600">Mức {index + 1} · {fallback.label}</p><input value={level.label} onChange={(event) => onChange(level.code, { label: event.target.value })} maxLength={60} placeholder={fallback.label} className="field-control" /><textarea value={level.description} onChange={(event) => onChange(level.code, { description: event.target.value })} maxLength={600} rows={2} placeholder={fallback.description} className="rounded-xl border border-slate-200 p-3 text-xs leading-5 outline-none focus:border-brand-500" /></div>; })}
    <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onCancel}>Hủy</Button><Button size="sm" disabled={saving} onClick={onSave}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Đang lưu" : "Lưu mức độ"}</Button></div>
  </div>;
}

function GeneratedQuestionCard({
  question,
  index,
  difficultyLevels,
  onReplace,
  onError,
}: {
  question: GeneratedQuestion;
  index: number;
  difficultyLevels: DifficultyLevelDefinition[];
  onReplace: (question: GeneratedQuestion) => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    content: question.content,
    difficulty: question.difficulty,
    options: question.options,
    correctOptionIds: question.correctOptionIds,
    explanation: question.explanation,
  });

  useEffect(() => {
    setDraft({
      content: question.content,
      difficulty: question.difficulty,
      options: question.options,
      correctOptionIds: question.correctOptionIds,
      explanation: question.explanation,
    });
  }, [question]);

  async function run(action: () => Promise<GeneratedQuestion>) {
    setBusy(true);
    onError("");
    try {
      onReplace(await action());
    } catch (cause) {
      onError(errorMessage(cause, "Không thể cập nhật câu hỏi"));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    onError("");
    try {
      const result = await aiQuestionService.approve(question.id);
      onReplace(result.generatedQuestion);
    } catch (cause) {
      onError(errorMessage(cause, "Không thể duyệt câu hỏi"));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    await run(() => aiQuestionService.update(question.id, draft));
    setEditing(false);
  }

  function updateOption(indexToUpdate: number, text: string) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === indexToUpdate ? { ...option, text } : option,
      ),
    }));
  }

  const pending = question.status === "PENDING";
  const statusClass = question.status === "APPROVED"
    ? "bg-emerald-50 text-emerald-700"
    : question.status === "REJECTED"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
  const statusLabel = question.status === "APPROVED" ? "Đã duyệt" : question.status === "REJECTED" ? "Đã từ chối" : "Chờ duyệt";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs font-black uppercase tracking-wide text-brand-600">Câu {index + 1}</p><p className="mt-1 text-xs text-slate-400">{question.source.documentName} · trang {question.source.page}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>{statusLabel}</span></header>
      {editing ? (
        <div className="mt-4 grid gap-4">
          <textarea rows={3} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} className="rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-brand-500" />
          <select value={draft.difficulty} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value as Difficulty }))} className="field-control max-w-48">{difficultyLevels.map((level) => <option key={level.code} value={level.code}>{level.label}</option>)}</select>
          <div className="grid gap-2">{draft.options.map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2"><button type="button" onClick={() => setDraft((current) => ({ ...current, correctOptionIds: [option.id] }))} className={`grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-black ${draft.correctOptionIds.includes(option.id) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-500"}`}>{option.label}</button><input value={option.text} onChange={(event) => updateOption(optionIndex, event.target.value)} className="field-control" /></div>)}</div>
          <textarea rows={3} value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Lời giải" className="rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-500" />
          <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="size-4" />Hủy</Button><Button size="sm" disabled={busy} onClick={() => void save()}><Save className="size-4" />Lưu</Button></div>
        </div>
      ) : (
        <div className="mt-4">
          <h3 className="font-bold leading-6 text-slate-900">{question.content}</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <div key={option.id} className={`rounded-xl border p-3 text-sm ${question.correctOptionIds.includes(option.id) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}><b className="mr-2">{option.label}.</b>{option.text}</div>)}</div>
          {question.explanation ? <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-slate-600"><b className="text-brand-700">Lời giải:</b> {question.explanation}</p> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {pending ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}><Pencil className="size-4" />Sửa</Button> : null}
            {pending ? <Button variant="secondary" size="sm" disabled={busy} onClick={() => void run(() => aiQuestionService.regenerate(question.id))}><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />Tạo lại</Button> : null}
            {pending ? <Button variant="danger" size="sm" disabled={busy} onClick={() => void run(() => aiQuestionService.reject(question.id))}><X className="size-4" />Từ chối</Button> : null}
            {pending ? <Button size="sm" disabled={busy} onClick={() => void approve()}><Check className="size-4" />Duyệt vào ngân hàng</Button> : null}
          </div>
        </div>
      )}
    </article>
  );
}
