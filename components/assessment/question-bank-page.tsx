"use client";

import Link from "next/link";
import {
  FileQuestion,
  FolderInput,
  LoaderCircle,
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
import { CustomSelect, Input } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { academicDataService, questionBankService } from "@/lib/assessment-api";
import { getVietnameseSubjectName } from "@/lib/subject-localization";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type Question,
  type QuestionType,
  type Subject,
  type Topic,
} from "@/types/assessment";

const difficultyTone: Record<Difficulty, string> = {
  EASY: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HARD: "bg-rose-50 text-rose-700",
  VERY_HARD: "bg-violet-50 text-violet-700",
};

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveSubjects, setMoveSubjects] = useState<Subject[]>([]);
  const [moveTopics, setMoveTopics] = useState<Topic[]>([]);
  const [targetSubjectId, setTargetSubjectId] = useState("");
  const [moveMode, setMoveMode] = useState<"none" | "existing" | "new">("none");
  const [targetTopicId, setTargetTopicId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [loadingMoveTopics, setLoadingMoveTopics] = useState(false);
  const [movingQuestions, setMovingQuestions] = useState(false);
  const [moveError, setMoveError] = useState("");
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
      const loadedQuestions = await questionBankService.getQuestions({
        search: submittedSearch || undefined,
        difficulty: difficulty || undefined,
        type: type || undefined,
      });
      setQuestions(loadedQuestions);
      setSelectedIds((ids) =>
        ids.filter((id) =>
          loadedQuestions.some((question) => question.id === id),
        ),
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
  const sortedQuestions = [...questions].sort(
    (left, right) =>
      Number(Boolean(left.disabled)) - Number(Boolean(right.disabled)),
  );
  const pagedQuestions = sortedQuestions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const selectedQuestions = questions.filter((question) =>
    selectedIds.includes(question.id),
  );
  const allPageQuestionsSelected =
    pagedQuestions.length > 0 &&
    pagedQuestions.every((question) => selectedIds.includes(question.id));

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
      setSelectedIds((ids) => ids.filter((id) => id !== question.id));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa câu hỏi",
      );
    }
  }

  function toggleQuestionSelection(questionId: string) {
    setSelectedIds((ids) =>
      ids.includes(questionId)
        ? ids.filter((id) => id !== questionId)
        : [...ids, questionId],
    );
  }

  function toggleCurrentPageSelection() {
    const pageIds = pagedQuestions.map((question) => question.id);
    setSelectedIds((ids) =>
      allPageQuestionsSelected
        ? ids.filter((id) => !pageIds.includes(id))
        : [...new Set([...ids, ...pageIds])],
    );
  }

  async function openMoveModal() {
    setError("");
    setMoveError("");
    setNewTopicName("");
    setMoveSubjects([]);
    setMoveTopics([]);
    setTargetSubjectId("");
    setTargetTopicId("");
    setMoveMode("none");
    setMoveModalOpen(true);
    setLoadingMoveTopics(true);
    try {
      const subjects = await academicDataService.getSubjects();
      if (!subjects.length) {
        throw new Error("Hệ thống chưa có môn học đang hoạt động.");
      }
      const selectedSubjectIds = new Set(
        selectedQuestions.map((question) => question.subjectId),
      );
      const currentSubjectId =
        selectedSubjectIds.size === 1 &&
        subjects.some(
          (subject) => subject.id === selectedQuestions[0]?.subjectId,
        )
          ? selectedQuestions[0].subjectId
          : subjects[0].id;
      setMoveSubjects(subjects);
      setTargetSubjectId(currentSubjectId);
      const topics = await academicDataService.getTopics(currentSubjectId);
      setMoveTopics(topics);
      setTargetTopicId(topics[0]?.id ?? "");
      setMoveMode("none");
    } catch (cause) {
      setMoveError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải danh sách chủ đề",
      );
    } finally {
      setLoadingMoveTopics(false);
    }
  }

  async function changeTargetSubject(subjectId: string) {
    setTargetSubjectId(subjectId);
    setMoveTopics([]);
    setTargetTopicId("");
    setMoveError("");
    setLoadingMoveTopics(true);
    try {
      const topics = await academicDataService.getTopics(subjectId);
      setMoveTopics(topics);
      setTargetTopicId(topics[0]?.id ?? "");
      setMoveMode("none");
    } catch (cause) {
      setMoveError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải danh sách chủ đề",
      );
    } finally {
      setLoadingMoveTopics(false);
    }
  }

  async function moveSelectedQuestions() {
    setMovingQuestions(true);
    setMoveError("");
    try {
      const result = await questionBankService.moveQuestionsToTopic({
        questionIds: selectedIds,
        subjectId: targetSubjectId,
        ...(moveMode === "existing" && targetTopicId
          ? { topicId: targetTopicId }
          : moveMode === "new"
            ? { newTopicName: newTopicName.trim() }
            : {}),
      });
      const updatedById = new Map(
        result.questions.map((question) => [question.id, question]),
      );
      setQuestions((items) =>
        items.map((question) => updatedById.get(question.id) ?? question),
      );
      setSelectedIds([]);
      setMoveModalOpen(false);
    } catch (cause) {
      setMoveError(
        cause instanceof Error ? cause.message : "Không thể di chuyển câu hỏi",
      );
    } finally {
      setMovingQuestions(false);
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
              <CustomSelect
                value={difficulty}
                options={[
                  { value: "", label: "Mọi độ khó" },
                  ...Object.entries(DIFFICULTY_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  ),
                ]}
                buttonClassName="!h-[42px] !rounded-lg focus:!ring-0"
                ariaLabel="Lọc theo độ khó"
                onValueChange={(value) => {
                  setPage(1);
                  setDifficulty(value as Difficulty | "");
                }}
              />
              <CustomSelect
                value={type}
                options={[
                  { value: "", label: "Mọi loại câu hỏi" },
                  ...Object.entries(QUESTION_TYPE_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  ),
                ]}
                buttonClassName="!h-[42px] !rounded-lg focus:!ring-0"
                ariaLabel="Lọc theo loại câu hỏi"
                onValueChange={(value) => {
                  setPage(1);
                  setType(value as QuestionType | "");
                }}
              />
            </div>

            <div className="flex shrink-0 flex-nowrap justify-end gap-2">
              {selectedIds.length ? (
                <Button
                  variant="outline"
                  className="!h-[42px] !rounded-lg"
                  onClick={() => void openMoveModal()}
                >
                  <FolderInput className="size-4" />
                  Di chuyển môn ({selectedIds.length})
                </Button>
              ) : null}
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
                  <TableHead className="w-14 text-center">
                    <input
                      type="checkbox"
                      checked={allPageQuestionsSelected}
                      onChange={toggleCurrentPageSelection}
                      className="size-4 cursor-pointer rounded border-white/70 accent-brand-700"
                      aria-label="Chọn tất cả câu hỏi trên trang này"
                    />
                  </TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="w-56">Môn</TableHead>
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
                  ? pagedQuestions.map((question) => (
                      <tr
                        key={question.id}
                        aria-selected={selectedIds.includes(question.id)}
                        className={`cursor-pointer transition hover:bg-slate-50/70 ${
                          selectedIds.includes(question.id)
                            ? "bg-blue-50/60"
                            : ""
                        }`}
                        onClick={() => setEditingQuestion(question)}
                      >
                        <TableCell
                          className="text-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(question.id)}
                            onChange={() =>
                              toggleQuestionSelection(question.id)
                            }
                            className="size-4 cursor-pointer rounded border-slate-300 accent-brand-600"
                            aria-label={`Chọn câu hỏi ${question.content}`}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="max-w-4xl text-[14px] font-bold leading-6 text-slate-700">
                            {question.content}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {question.options.length} lựa chọn ·{" "}
                            {question.defaultPoints} điểm
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
                        <TableCell onClick={(event) => event.stopPropagation()}>
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
      <Modal
        open={moveModalOpen}
        title={`Di chuyển môn cho ${selectedIds.length} câu hỏi`}
        description="Chọn môn đích; chủ đề là tùy chọn. Các bài kiểm tra đã tạo vẫn giữ nguyên môn, chủ đề cũ của câu hỏi."
        onClose={() => !movingQuestions && setMoveModalOpen(false)}
        footer={
          <>
            <Button
              variant="outline"
              disabled={movingQuestions}
              onClick={() => setMoveModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              disabled={
                movingQuestions ||
                loadingMoveTopics ||
                !targetSubjectId ||
                (moveMode === "existing"
                  ? !targetTopicId
                  : moveMode === "new"
                    ? newTopicName.trim().length < 2
                    : false)
              }
              onClick={() => void moveSelectedQuestions()}
            >
              {movingQuestions ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FolderInput className="size-4" />
              )}
              Di chuyển môn
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {moveError ? <ErrorPanel message={moveError} /> : null}
          <CustomSelect
            label="Môn học đích"
            value={targetSubjectId}
            options={moveSubjects.map((subject) => ({
              value: subject.id,
              label: getVietnameseSubjectName(subject),
            }))}
            disabled={loadingMoveTopics && !moveSubjects.length}
            onValueChange={(value) => void changeTargetSubject(value)}
          />
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                moveMode === "none"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500"
              }`}
              onClick={() => setMoveMode("none")}
            >
              Không chủ đề
            </button>
            <button
              type="button"
              disabled={!moveTopics.length || loadingMoveTopics}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                moveMode === "existing"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => setMoveMode("existing")}
            >
              Chủ đề có sẵn
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                moveMode === "new"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500"
              }`}
              onClick={() => setMoveMode("new")}
            >
              Tạo chủ đề mới
            </button>
          </div>
          {loadingMoveTopics ? (
            <p className="flex items-center gap-2 py-3 text-sm text-slate-500">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải chủ đề...
            </p>
          ) : moveMode === "none" ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Câu hỏi sẽ được chuyển sang môn đã chọn và để ở trạng thái chưa phân loại.
            </p>
          ) : moveMode === "existing" ? (
            <CustomSelect
              label="Chủ đề đích"
              value={targetTopicId}
              options={moveTopics.map((topic) => ({
                value: topic.id,
                label: topic.name,
              }))}
              onValueChange={setTargetTopicId}
            />
          ) : (
            <Input
              label="Tên chủ đề mới"
              value={newTopicName}
              maxLength={120}
              autoFocus
              placeholder="Ví dụ: Chương 2 - Đạo hàm"
              onChange={(event) => setNewTopicName(event.target.value)}
            />
          )}
        </div>
      </Modal>
    </AssessmentShell>
  );
}
