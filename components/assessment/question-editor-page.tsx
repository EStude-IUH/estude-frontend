"use client";

import { ArrowLeft, Check, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-control";
import { academicDataService, questionBankService } from "@/lib/assessment-api";
import type {
  Difficulty,
  QuestionInput,
  QuestionOption,
  QuestionType,
  Subject,
  Topic,
} from "@/types/assessment";

const initialOptions: QuestionOption[] = [
  { id: "a", label: "A", text: "" },
  { id: "b", label: "B", text: "" },
  { id: "c", label: "C", text: "" },
  { id: "d", label: "D", text: "" },
];

export function QuestionEditorPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const questionId = params.id === "new" ? undefined : params.id;
  const [form, setForm] = useState<QuestionInput>({
    subjectId: "",
    subjectName: "",
    topicId: "",
    topicName: "",
    content: "",
    type: "SINGLE_CHOICE",
    difficulty: "MEDIUM",
    options: initialOptions,
    correctOptionIds: [],
    defaultPoints: 1,
    explanation: "",
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(Boolean(questionId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void academicDataService
      .getSubjects()
      .then((items) => {
        setSubjects(items);
        if (!questionId && items[0])
          setForm((current) => ({
            ...current,
            subjectId: items[0].id,
            subjectName: items[0].name,
          }));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải môn học",
        ),
      );
  }, [questionId]);

  useEffect(() => {
    if (!form.subjectId) return;
    void academicDataService
      .getTopics(form.subjectId)
      .then((items) => {
        setTopics(items);
        if (!questionId && items[0] && !form.topicId)
          setForm((current) => ({
            ...current,
            topicId: items[0].id,
            topicName: items[0].name,
          }));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải chủ đề",
        ),
      );
  }, [form.subjectId, form.topicId, questionId]);

  useEffect(() => {
    if (!questionId) return;
    void questionBankService
      .getQuestionById(questionId)
      .then((question) =>
        setForm({
          subjectId: question.subjectId,
          subjectName: question.subjectName,
          topicId: question.topicId,
          topicName: question.topicName,
          content: question.content,
          type: question.type,
          difficulty: question.difficulty,
          options: question.options,
          correctOptionIds: question.correctOptionIds,
          defaultPoints: question.defaultPoints,
          explanation: question.explanation,
        }),
      )
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải câu hỏi",
        ),
      )
      .finally(() => setLoading(false));
  }, [questionId]);

  function update<K extends keyof QuestionInput>(
    key: K,
    value: QuestionInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseSubject(subjectId: string) {
    const subject = subjects.find((item) => item.id === subjectId);
    if (!subject) return;
    setForm((current) => ({
      ...current,
      subjectId: subject.id,
      subjectName: subject.name,
      topicId: "",
      topicName: "",
    }));
  }

  function chooseTopic(topicId: string) {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic) return;
    setForm((current) => ({
      ...current,
      topicId: topic.id,
      topicName: topic.name,
    }));
  }

  function changeType(type: QuestionType) {
    update("type", type);
    if (type === "ESSAY") update("correctOptionIds", []);
    if (type === "TRUE_FALSE")
      update("options", [
        { id: "true", label: "Đ", text: "Đúng" },
        { id: "false", label: "S", text: "Sai" },
      ]);
    if (type !== "TRUE_FALSE" && form.options.length < 4)
      update("options", initialOptions);
  }

  function updateOption(index: number, text: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, text } : option,
      ),
    }));
  }

  function toggleCorrect(id: string) {
    setForm((current) => {
      const selected = current.correctOptionIds.includes(id);
      return {
        ...current,
        correctOptionIds: selected
          ? current.correctOptionIds.filter((item) => item !== id)
          : current.type === "MULTIPLE_CHOICE"
            ? [...current.correctOptionIds, id]
            : [id],
      };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        options: form.type === "ESSAY" ? [] : form.options,
        correctOptionIds: form.type === "ESSAY" ? [] : form.correctOptionIds,
      };
      if (!payload.content.trim())
        throw new Error("Vui lòng nhập nội dung câu hỏi");
      if (payload.type !== "ESSAY" && payload.correctOptionIds.length === 0)
        throw new Error("Vui lòng chọn đáp án đúng");
      if (questionId)
        await questionBankService.updateQuestion(questionId, payload);
      else await questionBankService.createQuestion(payload);
      router.push("/teacher/question-bank");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu câu hỏi",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <AssessmentShell>
        <LoadingPanel />
      </AssessmentShell>
    );

  return (
    <AssessmentShell>
      <PageHeading
        title={questionId ? "Chỉnh sửa câu hỏi" : "Tạo câu hỏi mới"}
        action={
          <Button
            variant="ghost"
            onClick={() => router.push("/teacher/question-bank")}
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </Button>
        }
      />
      {error ? (
        <div className="mb-4">
          <ErrorPanel message={error} />
        </div>
      ) : null}

      <form
        onSubmit={(event) => void submit(event)}
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5">
            <Textarea
              label="Nội dung câu hỏi"
              required
              value={form.content}
              onChange={(event) => update("content", event.target.value)}
              rows={5}
              placeholder="Nhập nội dung câu hỏi..."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Loại câu hỏi"
                value={form.type}
                onChange={(event) =>
                  changeType(event.target.value as QuestionType)
                }
              >
                <option value="SINGLE_CHOICE">Trắc nghiệm một đáp án</option>
                <option value="MULTIPLE_CHOICE">
                  Trắc nghiệm nhiều đáp án
                </option>
                <option value="TRUE_FALSE">Đúng / Sai</option>
                <option value="ESSAY">Tự luận</option>
              </Select>
              <Select
                label="Độ khó"
                value={form.difficulty}
                onChange={(event) =>
                  update("difficulty", event.target.value as Difficulty)
                }
              >
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
                <option value="VERY_HARD">Rất khó</option>
              </Select>
            </div>

            {form.type !== "ESSAY" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Danh sách đáp án
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Chọn nút bên trái để đánh dấu đáp án đúng.
                    </p>
                  </div>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    {form.type === "SINGLE_CHOICE" ? "Chọn 1" : "Chọn nhiều"}
                  </span>
                </div>
                <div className="space-y-2">
                  {form.options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCorrect(option.id)}
                        className={`grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-black transition ${form.correctOptionIds.includes(option.id) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-500 hover:border-brand-300"}`}
                        aria-label={`Đánh dấu đáp án ${option.label} là đúng`}
                      >
                        {form.correctOptionIds.includes(option.id) ? (
                          <Check className="size-4" />
                        ) : (
                          option.label
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <Input
                          value={option.text}
                          onChange={(event) =>
                            updateOption(index, event.target.value)
                          }
                          required
                          placeholder={`Đáp án ${option.label}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Textarea
                label="Hướng dẫn chấm / lời giải"
                value={form.explanation}
                onChange={(event) => update("explanation", event.target.value)}
                rows={4}
                placeholder="Nhập gợi ý cho giáo viên chấm tự luận..."
              />
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/teacher/question-bank")}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="size-4" />
                {saving ? "Đang lưu..." : "Lưu câu hỏi"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Phân loại</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Giúp tìm và chọn câu hỏi nhanh hơn khi tạo đề.
          </p>
          <div className="mt-5 grid gap-4">
            <Select
              label="Môn học"
              value={form.subjectId}
              onChange={(event) => chooseSubject(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
            <Select
              label="Chủ đề"
              value={form.topicId}
              onChange={(event) => chooseTopic(event.target.value)}
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </Select>
            <Input
              label="Điểm mặc định"
              type="number"
              min="0"
              step="0.25"
              value={form.defaultPoints}
              onChange={(event) =>
                update("defaultPoints", Number(event.target.value))
              }
            />
          </div>
        </aside>
      </form>
    </AssessmentShell>
  );
}
