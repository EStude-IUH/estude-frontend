"use client";

import Link from "next/link";
import {
  BrainCircuit,
  Check,
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
import { CustomSelect, Input, Textarea } from "@/components/ui/form-control";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  academicDataService,
  aiQuestionService,
  aiQuestionSettingsService,
} from "@/lib/assessment-api";
import { getVietnameseSubjectName } from "@/lib/subject-localization";
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
  {
    code: "EASY",
    label: "Dễ",
    description:
      "Kiểm tra khả năng ghi nhớ, nhận biết và hiểu trực tiếp kiến thức trong tài liệu.",
  },
  {
    code: "MEDIUM",
    label: "Trung bình",
    description:
      "Yêu cầu áp dụng kiến thức hoặc liên kết hai ý có liên quan trong tài liệu.",
  },
  {
    code: "HARD",
    label: "Khó",
    description:
      "Yêu cầu phân tích, so sánh hoặc suy luận từ nhiều thông tin trong tài liệu.",
  },
  {
    code: "VERY_HARD",
    label: "Rất khó",
    description:
      "Yêu cầu tổng hợp nhiều phần, đánh giá tình huống và tránh các phương án nhiễu tinh vi.",
  },
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

function createDifficultyDraft(
  settings: TeacherDifficultySettings,
): DifficultyLevelDefinition[] {
  return settings.effectiveLevels.map((effective) => {
    const custom = settings.customLevels?.find(
      (level) => level.code === effective.code,
    );
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
  const [difficultySettings, setDifficultySettings] =
    useState<TeacherDifficultySettings | null>(null);
  const [difficultyDraft, setDifficultyDraft] = useState<
    DifficultyLevelDefinition[]
  >([]);
  const [customizingDifficulty, setCustomizingDifficulty] = useState(false);
  const [savingDifficulty, setSavingDifficulty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      academicDataService.getMaterialLibrary(),
      academicDataService.getSubjects(),
      aiQuestionSettingsService.getMine(),
    ])
      .then(([materialItems, subjectItems, teacherSettings]) => {
        const pdfs = materialItems.filter(
          (item) =>
            item.mimeType === "application/pdf" ||
            item.originalName.toLowerCase().endsWith(".pdf"),
        );
        setMaterials(pdfs);
        setSubjects(subjectItems);
        setDifficultySettings(teacherSettings);
        setDifficultyDraft(createDifficultyDraft(teacherSettings));
        setForm((current) => ({
          ...current,
          materialId: current.materialId || pdfs[0]?.id || "",
          quantity: teacherSettings.defaultQuantity,
          difficulty: teacherSettings.effectiveLevels.some(
            (level) => level.code === current.difficulty,
          )
            ? current.difficulty
            : (teacherSettings.effectiveLevels[0]?.code ?? "MEDIUM"),
        }));
      })
      .catch((cause) => {
        setError(errorMessage(cause, "Không thể tải dữ liệu tạo câu hỏi"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.subjectId) {
      setTopics([]);
      setForm((current) =>
        current.topicId ? { ...current, topicId: undefined } : current,
      );
      return;
    }
    academicDataService
      .getTopics(form.subjectId)
      .then((items) => {
        setTopics(items);
        setForm((current) => ({
          ...current,
          topicId: items.some((item) => item.id === current.topicId)
            ? current.topicId
            : undefined,
        }));
      })
      .catch((cause) => setError(errorMessage(cause, "Không thể tải chủ đề")));
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
    const maxQuantity =
      difficultySettings?.maxQuestionsPerGeneration ?? 100;
    if (
      !Number.isInteger(form.quantity) ||
      form.quantity < 1 ||
      form.quantity > maxQuantity
    ) {
      setError(`Số lượng câu hỏi phải từ 1 đến ${maxQuantity}.`);
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
    setDifficultyDraft((current) =>
      count === 3
        ? current.filter((level) => level.code !== "VERY_HARD")
        : builtInDifficultyLevels.map(
            (fallback) =>
              current.find((level) => level.code === fallback.code) ?? {
                code: fallback.code,
                label: "",
                description: "",
              },
          ),
    );
  }

  function updateDifficultyDraft(
    code: Difficulty,
    patch: Partial<DifficultyLevelDefinition>,
  ) {
    setDifficultyDraft((current) =>
      current.map((level) =>
        level.code === code ? { ...level, ...patch } : level,
      ),
    );
  }

  async function saveDifficultySettings() {
    setSavingDifficulty(true);
    setError("");
    try {
      const result = await aiQuestionSettingsService.updateMine({
        levels: difficultyDraft,
      });
      setDifficultySettings(result);
      setDifficultyDraft(createDifficultyDraft(result));
      setCustomizingDifficulty(false);
      setForm((current) => ({
        ...current,
        difficulty: result.effectiveLevels.some(
          (level) => level.code === current.difficulty,
        )
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
    setQuestions((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  if (loading)
    return (
      <AssessmentShell>
        <LoadingPanel />
      </AssessmentShell>
    );
  const approvedCount = questions.filter(
    (item) => item.status === "APPROVED",
  ).length;
  const activeDifficultyLevels =
    difficultySettings?.effectiveLevels ?? builtInDifficultyLevels.slice(0, 3);

  return (
    <AssessmentShell>
      <PageHeading
        eyebrow="RAG · Gemini"
        title="Tạo câu hỏi tự động"
        description="Chọn PDF từ thư viện của bạn. AI chỉ dùng nội dung trong tài liệu và mọi câu đều cần được duyệt trước khi vào ngân hàng."
      />
      {error ? (
        <div className="mb-3">
          <ErrorPanel message={error} />
        </div>
      ) : null}
      <div className="grid items-start gap-3 xl:grid-cols-[480px_minmax(0,1fr)]">
        <form
          onSubmit={(event) => void generate(event)}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-card xl:sticky xl:top-20 xl:max-h-[calc(100dvh-96px)] xl:overflow-y-auto"
        >
          <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600">
              <Sparkles className="size-[18px]" />
            </span>
            <div>
              <h2 className="font-black text-slate-900">Cấu hình bộ câu hỏi</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                RAG tìm đúng đoạn liên quan trong PDF
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            <Field label="Tài liệu nguồn">
              <CustomSelect
                value={form.materialId}
                options={materials.map((material) => ({
                  value: material.id,
                  label: material.originalName,
                }))}
                onValueChange={(value) => update("materialId", value)}
                placeholder="Chọn PDF trong thư viện..."
                ariaLabel="Chọn tài liệu nguồn"
                searchable
                searchPlaceholder="Tìm tài liệu PDF..."
                emptyMessage="Không tìm thấy tài liệu"
              />
              {!materials.length ? (
                <Link
                  href="/teacher/materials"
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  + Tải PDF lên thư viện trước
                </Link>
              ) : null}
            </Field>
            <Field label="Nội dung/mục cần tạo câu hỏi (không bắt buộc)">
              <Input
                value={form.sourceFocus ?? ""}
                onChange={(event) => update("sourceFocus", event.target.value)}
                maxLength={200}
                placeholder="Ví dụ: Chuẩn hóa dữ liệu, chương 3, Linked List..."
              />
            </Field>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Môn học (không bắt buộc)">
                  <CustomSelect
                    value={form.subjectId ?? ""}
                    options={[
                      { value: "", label: "Không phân loại môn học" },
                      ...subjects.map((subject) => ({
                        value: subject.id,
                        label: getVietnameseSubjectName(subject),
                      })),
                    ]}
                    onValueChange={(value) =>
                      update("subjectId", value || undefined)
                    }
                    ariaLabel="Chọn môn học"
                    searchable
                    searchPlaceholder="Tìm môn học..."
                    emptyMessage="Không tìm thấy môn học"
                  />
                </Field>
                <Field label="Chủ đề gợi ý (không bắt buộc)">
                  <CustomSelect
                    disabled={!form.subjectId}
                    value={form.topicId ?? ""}
                    options={[
                      { value: "", label: "Tự xác định từ tài liệu" },
                      ...topics.map((topic) => ({
                        value: topic.id,
                        label: topic.name,
                      })),
                    ]}
                    onValueChange={(value) =>
                      update("topicId", value || undefined)
                    }
                    ariaLabel="Chọn chủ đề gợi ý"
                    searchable
                    searchPlaceholder="Tìm chủ đề..."
                    emptyMessage="Không tìm thấy chủ đề"
                  />
                </Field>
              </div>
              <Field label="Loại câu hỏi">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["SINGLE_CHOICE", "Trắc nghiệm"],
                      ["TRUE_FALSE", "Đúng / Sai"],
                    ] as const
                  ).map(([value, label]) => (
                    <ChoiceButton
                      key={value}
                      active={form.questionType === value}
                      onClick={() => update("questionType", value)}
                    >
                      {label}
                    </ChoiceButton>
                  ))}
                </div>
              </Field>
              <Field label="Độ khó">
                <div className="grid grid-cols-2 gap-2">
                  {activeDifficultyLevels.map((level) => (
                    <ChoiceButton
                      key={level.code}
                      active={form.difficulty === level.code}
                      onClick={() => update("difficulty", level.code)}
                    >
                      {level.label}
                    </ChoiceButton>
                  ))}
                </div>
                <span className="text-xs font-normal leading-5 text-slate-400">
                  {
                    activeDifficultyLevels.find(
                      (level) => level.code === form.difficulty,
                    )?.description
                  }
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomizingDifficulty((current) => !current)
                  }
                  className="flex w-fit items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline"
                >
                  <Settings2 className="size-3.5" />
                  Tùy chỉnh 3–4 mức độ
                </button>
              </Field>
            </div>
            {customizingDifficulty && difficultySettings ? (
              <TeacherDifficultyEditor
                settings={difficultySettings}
                levels={difficultyDraft}
                saving={savingDifficulty}
                onCountChange={changeDifficultyLevelCount}
                onChange={updateDifficultyDraft}
                onSave={() => void saveDifficultySettings()}
                onCancel={() => setCustomizingDifficulty(false)}
              />
            ) : null}
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <Field label="Số lượng câu hỏi">
                <Input
                  type="number"
                  min="1"
                  max={
                    difficultySettings?.maxQuestionsPerGeneration ?? 100
                  }
                  required
                  value={form.quantity}
                  onChange={(event) =>
                    update("quantity", Number(event.target.value))
                  }
                />
                <span className="text-xs font-normal text-slate-400">
                  Tối đa {difficultySettings?.maxQuestionsPerGeneration ?? 100}{" "}
                  câu mỗi lần tạo.
                </span>
              </Field>
              <Field label="Điểm mặc định">
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  value={form.defaultPoints}
                  onChange={(event) =>
                    update("defaultPoints", Number(event.target.value))
                  }
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <span>
                <b className="block text-sm text-slate-700">
                  Sinh lời giải chi tiết
                </b>
                <small className="text-xs text-slate-400">
                  Giúp kiểm tra đáp án trước khi duyệt
                </small>
              </span>
              <ToggleSwitch
                checked={form.includeExplanation}
                onCheckedChange={(checked) => update("includeExplanation", checked)}
                aria-label="Sinh lời giải chi tiết"
              />
            </div>
            <Button
              type="submit"
              disabled={generating || !materials.length}
              className="w-full"
            >
              {generating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {generating ? "Gemini đang tạo..." : "Tạo câu hỏi"}
            </Button>
          </div>
          <div className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-5 text-slate-500">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              Lần đầu dùng một PDF sẽ lâu hơn vì hệ thống cần trích xuất, chia
              đoạn và tạo embedding.
            </span>
          </div>
        </form>

        <section className="min-w-0">
          {generating ? (
            <div className="grid min-h-[260px] place-items-center rounded-lg border border-slate-200 bg-white p-5 text-center shadow-card xl:min-h-[calc(100dvh-96px)]">
              <div>
                <LoaderCircle className="mx-auto size-9 animate-spin text-violet-600" />
                <p className="mt-4 font-black text-slate-800">
                  Gemini đang tạo bộ câu hỏi...
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Đang truy xuất ngữ cảnh và kiểm tra kết quả có cấu trúc.
                </p>
              </div>
            </div>
          ) : questions.length ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-card">
                <div>
                  <p className="font-black text-slate-900">
                    Kết quả kiểm duyệt
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {questions.length} câu · {approvedCount} đã vào ngân hàng
                  </p>
                </div>
                {approvedCount ? (
                  <Link href="/teacher/question-bank">
                    <Button variant="secondary" size="sm">
                      <Check className="size-4" />
                      Xem ngân hàng
                    </Button>
                  </Link>
                ) : null}
              </div>
              {questions.map((question, index) => (
                <GeneratedQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  difficultyLevels={activeDifficultyLevels}
                  onReplace={replaceQuestion}
                  onError={setError}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center xl:min-h-[calc(100dvh-96px)]">
              <span className="grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <BrainCircuit className="size-6" />
              </span>
              <h2 className="mt-3 font-black text-slate-900">
                Chưa có kết quả
              </h2>
              <p className="mt-1 max-w-md text-sm leading-5 text-slate-500">
                Chọn tài liệu, thiết lập thông số rồi nhấn “Tạo câu hỏi”.
              </p>
            </div>
          )}
        </section>
      </div>
    </AssessmentShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`w-full ${active ? "border-brand-500 !bg-blue-50 text-brand-700" : "border-slate-200 text-slate-500"}`}
    >
      {children}
    </Button>
  );
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
  onChange: (
    code: Difficulty,
    patch: Partial<DifficultyLevelDefinition>,
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function fallbackFor(code: Difficulty) {
    return (
      settings.systemLevels.find((level) => level.code === code) ??
      builtInDifficultyLevels.find((level) => level.code === code)!
    );
  }

  return (
    <div className="grid gap-2.5 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-800">
            Mức độ riêng của bạn
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ô trống sẽ dùng giá trị mặc định của Admin.
          </p>
        </div>
        <div className="flex gap-1">
          {([3, 4] as const).map((count) => (
            <Button
              key={count}
              variant="ghost"
              size="sm"
              onClick={() => onCountChange(count)}
              className={`!h-7 !px-2.5 text-[11px] font-black ${levels.length === count ? "!bg-violet-600 text-white" : "!bg-white text-slate-500"}`}
            >
              {count} mức
            </Button>
          ))}
        </div>
      </div>
      {levels.map((level, index) => {
        const fallback = fallbackFor(level.code);
        return (
          <div
            key={level.code}
            className="grid gap-2 rounded-lg border border-violet-100 bg-white p-2.5"
          >
            <p className="text-xs font-black uppercase tracking-wide text-violet-600">
              Mức {index + 1} · {fallback.label}
            </p>
            <Input
              value={level.label}
              onChange={(event) =>
                onChange(level.code, { label: event.target.value })
              }
              maxLength={60}
              placeholder={fallback.label}
            />
            <Textarea
              value={level.description}
              onChange={(event) =>
                onChange(level.code, { description: event.target.value })
              }
              maxLength={600}
              rows={2}
              placeholder={fallback.description}
              className="min-h-20 text-xs leading-5"
            />
          </div>
        );
      })}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Đang lưu" : "Lưu mức độ"}
        </Button>
      </div>
    </div>
  );
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
  const statusClass =
    question.status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : question.status === "REJECTED"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
  const statusLabel =
    question.status === "APPROVED"
      ? "Đã duyệt"
      : question.status === "REJECTED"
        ? "Đã từ chối"
        : "Chờ duyệt";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-600">
            Câu {index + 1}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {question.source.documentName} · trang {question.source.page}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}
        >
          {statusLabel}
        </span>
      </header>
      {editing ? (
        <div className="mt-3 grid gap-3">
          <Textarea
            rows={3}
            value={draft.content}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            className="font-semibold"
          />
          <CustomSelect
            value={draft.difficulty}
            options={difficultyLevels.map((level) => ({
              value: level.code,
              label: level.label,
            }))}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                difficulty: value as Difficulty,
              }))
            }
            className="max-w-48"
            ariaLabel="Chọn độ khó"
          />
          <div className="grid gap-2">
            {draft.options.map((option, optionIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      correctOptionIds: [option.id],
                    }))
                  }
                  className={`!size-9 shrink-0 !p-0 text-xs font-black ${draft.correctOptionIds.includes(option.id) ? "border-brand-600 !bg-brand-600 text-white" : "border-slate-300 text-slate-500"}`}
                >
                  {option.label}
                </Button>
                <div className="min-w-0 flex-1">
                  <Input
                    value={option.text}
                    onChange={(event) =>
                      updateOption(optionIndex, event.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Textarea
            rows={3}
            value={draft.explanation}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                explanation: event.target.value,
              }))
            }
            placeholder="Lời giải"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="size-4" />
              Hủy
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              <Save className="size-4" />
              Lưu
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <h3 className="font-bold leading-6 text-slate-900">
            {question.content}
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`rounded-lg border p-2.5 text-sm ${question.correctOptionIds.includes(option.id) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}
              >
                <b className="mr-2">{option.label}.</b>
                {option.text}
              </div>
            ))}
          </div>
          {question.explanation ? (
            <p className="mt-3 rounded-lg bg-blue-50 p-2.5 text-sm leading-6 text-slate-600">
              <b className="text-brand-700">Lời giải:</b> {question.explanation}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
            {pending ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
                Sửa
              </Button>
            ) : null}
            {pending ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(() => aiQuestionService.regenerate(question.id))
                }
              >
                <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
                Tạo lại
              </Button>
            ) : null}
            {pending ? (
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(() => aiQuestionService.reject(question.id))
                }
              >
                <X className="size-4" />
                Từ chối
              </Button>
            ) : null}
            {pending ? (
              <Button size="sm" disabled={busy} onClick={() => void approve()}>
                <Check className="size-4" />
                Duyệt vào ngân hàng
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}
