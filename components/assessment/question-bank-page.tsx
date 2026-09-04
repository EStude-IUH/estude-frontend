"use client";

import Link from "next/link";
import {
  FileQuestion,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AssessmentShell,
  ErrorPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
import { QuestionEditorForm } from "@/components/assessment/question-editor-page";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableLoadingBarRow,
} from "@/components/ui/data-table";
import { DataTableFooter } from "@/components/ui/data-table-footer";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { Select } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
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
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [type, setType] = useState<QuestionType | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuestions(
        await questionBankService.getQuestions({
          search: submittedSearch || undefined,
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
  }, [difficulty, submittedSearch, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const pagedQuestions = questions.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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

  async function updateQuestionStatus(question: Question, enabled: boolean) {
    setUpdatingStatusId(question.id);
    setError("");
    try {
      const updatedQuestion = await questionBankService.updateQuestion(
        question.id,
        { disabled: !enabled },
      );
      setQuestions((items) =>
        items.map((item) =>
          item.id === updatedQuestion.id ? updatedQuestion : item,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể cập nhật trạng thái câu hỏi",
      );
    } finally {
      setUpdatingStatusId("");
    }
  }

  return (
    <AssessmentShell>
      <PageHeading title="Ngân hàng câu hỏi" />

      <div className="flex h-[calc(100dvh-86px)] min-h-0 w-full flex-col overflow-hidden">
        <section className="shrink-0 rounded-lg border border-slate-200 bg-white p-2.5 shadow-card">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[360px_170px_190px]">
            <DebouncedSearchInput
              className="!h-[42px] !rounded-lg focus:!ring-0"
              value={search}
              onValueChange={setSearch}
              onSearch={(value) => {
                setPage(1);
                setSubmittedSearch(value);
              }}
              placeholder="Tìm theo nội dung câu hỏi..."
            />
            <Select
              className="!h-[42px] !rounded-lg focus:!ring-0"
              value={difficulty}
              onChange={(event) => {
                setPage(1);
                setDifficulty(event.target.value as Difficulty | "");
              }}
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
              className="!h-[42px] !rounded-lg focus:!ring-0"
              value={type}
              onChange={(event) => {
                setPage(1);
                setType(event.target.value as QuestionType | "");
              }}
              aria-label="Lọc theo loại câu hỏi"
            >
              <option value="">Mọi loại câu hỏi</option>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            </div>

            <div className="flex shrink-0 flex-nowrap justify-end gap-2">
              <Link href="/teacher/question-bank/generate">
                <Button variant="secondary" className="!h-[42px] !rounded-lg">
                  <Sparkles className="size-4" />
                  Tạo bằng AI
                </Button>
              </Link>
              <Link href="/teacher/question-bank/new">
                <Button className="!h-[42px] !rounded-lg">
                  <Plus className="size-4" />
                  Tạo câu hỏi
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          {error ? (
            <div className="m-4">
              <ErrorPanel message={error} />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-[1220px]">
              <TableHeader className="sticky top-0 z-10 !bg-brand-600 !text-white">
                <tr>
                  <TableHead className="w-14 text-center">#</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="w-56">Môn / Chủ đề</TableHead>
                  <TableHead className="w-40 text-center">Loại</TableHead>
                  <TableHead className="w-36 text-center">Độ khó</TableHead>
                  <TableHead className="w-40">Trạng thái</TableHead>
                  <TableHead className="w-32 text-right">Thao tác</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {loading ? <TableLoadingBarRow colSpan={7} /> : null}
                {!loading && questions.length === 0 ? (
                  <TableEmptyRow
                    colSpan={7}
                    icon={<FileQuestion className="size-5 text-slate-400" />}
                    message="Chưa có câu hỏi phù hợp"
                  />
                ) : null}
                {!loading
                  ? pagedQuestions.map((question, index) => (
                      <tr
                        key={question.id}
                        className="cursor-pointer transition hover:bg-slate-50/70"
                        onClick={() => setEditingQuestion(question)}
                      >
                        <TableCell className="text-center text-xs text-slate-400">
                          {(page - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-4xl text-[14px] font-bold leading-6 text-slate-700">
                            {question.content}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {question.options.length} lựa chọn · {question.defaultPoints} điểm
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-slate-700">
                            {question.subjectName || "Chưa phân loại"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {question.topicName || "Tạo từ tài liệu"}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {QUESTION_TYPE_LABELS[question.type]}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${difficultyTone[question.difficulty]}`}
                          >
                            {DIFFICULTY_LABELS[question.difficulty]}
                          </span>
                        </TableCell>
                        <TableCell
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ToggleSwitch
                            checked={!question.disabled}
                            loading={updatingStatusId === question.id}
                            aria-label={
                              question.disabled
                                ? `Bật câu hỏi ${question.content}`
                                : `Vô hiệu hóa câu hỏi ${question.content}`
                            }
                            title={
                              question.disabled
                                ? "Bật câu hỏi"
                                : "Vô hiệu hóa câu hỏi"
                            }
                            onCheckedChange={(enabled) =>
                              void updateQuestionStatus(question, enabled)
                            }
                          />
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Chỉnh sửa"
                              aria-label={`Chỉnh sửa câu hỏi ${question.content}`}
                              onClick={() => setEditingQuestion(question)}
                            >
                              <Pencil size={18} strokeWidth={2.5} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              title="Xóa"
                              aria-label={`Xóa câu hỏi ${question.content}`}
                              onClick={() => void remove(question)}
                            >
                              <Trash2 size={18} strokeWidth={2.5} />
                            </Button>
                          </div>
                        </TableCell>
                      </tr>
                    ))
                  : null}
              </TableBody>
            </Table>
          </div>
          <DataTableFooter
            className="shrink-0 bg-white"
            rowCount={pagedQuestions.length}
            totalItems={questions.length}
            itemLabel="câu hỏi"
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>
      </div>
      {editingQuestion ? (
        <Modal
          open
          title="Chỉnh sửa câu hỏi"
          description="Cập nhật nội dung, phân loại, đáp án và điểm của câu hỏi."
          width="max-w-5xl"
          bodyClassName="max-h-[calc(100dvh-6rem)] overflow-y-auto !p-4"
          compact
          onClose={() => setEditingQuestion(null)}
        >
          <QuestionEditorForm
            key={editingQuestion.id}
            questionId={editingQuestion.id}
            embedded
            onCancel={() => setEditingQuestion(null)}
            onSaved={(updatedQuestion) => {
              setQuestions((items) =>
                items.map((item) =>
                  item.id === updatedQuestion.id ? updatedQuestion : item,
                ),
              );
              setEditingQuestion(null);
              void load();
            }}
          />
        </Modal>
      ) : null}
    </AssessmentShell>
  );
}
