"use client";

import Link from "next/link";
import {
  FileQuestion,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-control";
import { questionBankService } from "@/lib/assessment-api";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type Question,
  type QuestionType,
} from "@/types/assessment";

const difficultyTone: Record<Difficulty, string> = {
  EASY: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HARD: "bg-rose-50 text-rose-700",
  VERY_HARD: "bg-violet-50 text-violet-700",
};

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [type, setType] = useState<QuestionType | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setQuestions(
        await questionBankService.getQuestions({
          search: search || undefined,
          difficulty: difficulty || undefined,
          type: type || undefined,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải ngân hàng câu hỏi",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Filter changes intentionally trigger a server refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, type]);

  async function remove(question: Question) {
    if (
      !window.confirm(
        `Xóa câu hỏi “${question.content.slice(0, 45)}...” khỏi ngân hàng?`,
      )
    )
      return;
    try {
      await questionBankService.deleteQuestion(question.id);
      setQuestions((items) => items.filter((item) => item.id !== question.id));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa câu hỏi",
      );
    }
  }

  return (
    <AssessmentShell>
      <PageHeading title="Ngân hàng câu hỏi" />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
          <div className="grid min-w-0 flex-1 gap-2.5 md:grid-cols-[minmax(260px,1fr)_170px_190px_auto]">
            <Input
              icon={Search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load();
              }}
              placeholder="Tìm theo nội dung câu hỏi..."
              aria-label="Tìm câu hỏi"
            />
            <Select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as Difficulty | "")
              }
              aria-label="Lọc theo độ khó"
            >
              <option value="">Mọi độ khó</option>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={type}
              onChange={(event) =>
                setType(event.target.value as QuestionType | "")
              }
              aria-label="Lọc theo loại câu hỏi"
            >
              <option value="">Mọi loại câu hỏi</option>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => void load()}>
              <ListFilter className="size-4" />
              Lọc
            </Button>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 xl:border-l xl:border-slate-200 xl:pl-2.5">
            <Link href="/teacher/question-bank/generate">
              <Button variant="secondary">
                <Sparkles className="size-4" />
                Tạo bằng AI
              </Button>
            </Link>
            <Link href="/teacher/question-bank/new">
              <Button>
                <Plus className="size-4" />
                Tạo câu hỏi
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mb-4">
          <ErrorPanel message={error} />
        </div>
      ) : null}
      {loading ? (
        <LoadingPanel />
      ) : questions.length === 0 ? (
        <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <FileQuestion className="size-5" />
            </span>
            <p className="mt-3 font-bold text-slate-700">
              Chưa có câu hỏi phù hợp
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Thử đổi bộ lọc hoặc tạo câu hỏi mới.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_130px_130px_88px] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">
            <span>Nội dung</span>
            <span>Môn / chủ đề</span>
            <span>Loại</span>
            <span>Độ khó</span>
            <span />
          </div>
          {questions.map((question) => (
            <article
              key={question.id}
              className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50/50 md:grid-cols-[minmax(0,1fr)_170px_130px_130px_88px] md:items-center md:gap-4"
            >
              <div>
                <p className="font-bold leading-6 text-slate-900">
                  {question.content}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {question.options.length} lựa chọn · {question.defaultPoints}{" "}
                  điểm
                </p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-slate-700">
                  {question.subjectName || "Chưa phân loại"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {question.topicName || "Tạo từ tài liệu"}
                </p>
              </div>
              <span className="w-fit rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {QUESTION_TYPE_LABELS[question.type]}
              </span>
              <span
                className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${difficultyTone[question.difficulty]}`}
              >
                {DIFFICULTY_LABELS[question.difficulty]}
              </span>
              <div className="flex gap-1 md:justify-end">
                <Link
                  href={`/teacher/question-bank/${question.id}/edit`}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-brand-700"
                  aria-label="Sửa câu hỏi"
                >
                  <Pencil className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(question)}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Xóa câu hỏi"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AssessmentShell>
  );
}
