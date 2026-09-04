"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  FileCheck2,
  FileQuestion,
  ListChecks,
  Plus,
  Search,
  Settings2,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "@/components/assessment/assessment-shell";
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
import {
  CustomSelect,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import {
  academicDataService,
  examService,
  questionBankService,
  teacherSettingsService,
} from "@/lib/assessment-api";
import { matchesSearchKeyword } from "@/lib/search-keyword";
import { getVietnameseSubjectName } from "@/lib/subject-localization";
import {
  DIFFICULTY_LABELS,
  EXAM_STATUS_LABELS,
  QUESTION_TYPE_LABELS,
  type Exam,
  type ExamInput,
  type ExamQuestion,
  type ExamSettings,
  type Question,
  type Subject,
  type TeacherAssignedClass,
  type TeacherExamDefaults,
  type Topic,
} from "@/types/assessment";

const wizardSteps = [
  { label: "Thông tin", description: "Môn học và lớp", icon: BookOpen },
  { label: "Câu hỏi", description: "Xây dựng nội dung", icon: ListChecks },
  { label: "Cấu hình", description: "Thời gian làm bài", icon: Settings2 },
  { label: "Kiểm tra", description: "Xác nhận và lưu", icon: FileCheck2 },
];

function ExamWizardFrame({
  embedded,
  children,
}: {
  embedded: boolean;
  children: ReactNode;
}) {
  return embedded ? <>{children}</> : <AssessmentShell>{children}</AssessmentShell>;
}

function createBlankSettings(defaults?: TeacherExamDefaults): ExamSettings {
  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  startsAt.setHours(startsAt.getHours() + 1);
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + (defaults?.availabilityDays ?? 7));

  return {
    startsAt: toDateTimeLocal(startsAt.toISOString()),
    endsAt: toDateTimeLocal(endsAt.toISOString()),
    durationMinutes: defaults?.durationMinutes ?? 45,
    attemptsAllowed: defaults?.attemptsAllowed ?? 1,
    shuffleQuestions: defaults?.shuffleQuestions ?? false,
    shuffleAnswers: defaults?.shuffleAnswers ?? false,
    showScoreImmediately: defaults?.showScoreImmediately ?? true,
    showCorrectAnswers: defaults?.showCorrectAnswers ?? true,
  };
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusClass(status: Exam["status"]) {
  return {
    DRAFT: "bg-slate-100 text-slate-600",
    SCHEDULED: "bg-amber-50 text-amber-700",
    ONGOING: "bg-emerald-50 text-emerald-700",
    ENDED: "bg-blue-50 text-blue-700",
  }[status];
}

function formatExamDate(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatClassLabel(
  classes: TeacherAssignedClass[],
  classId: string,
  fallbackName: string,
): string {
  const schoolClass = classes.find((item) => item.id === classId);
  if (!schoolClass) return fallbackName;
  return schoolClass.code === schoolClass.name
    ? schoolClass.code
    : `${schoolClass.code} · ${schoolClass.name}`;
}

export function TeacherExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<TeacherAssignedClass[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Exam["status"]>(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [publishingId, setPublishingId] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  function openEditor(examId: string) {
    setEditingExamId(examId);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingExamId(null);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [loadedExams, loadedClasses] = await Promise.all([
        examService.getExams(),
        academicDataService.getTeacherAssignedClasses(),
      ]);
      setExams(loadedExams);
      setAssignedClasses(loadedClasses);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải bài kiểm tra",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function publish(exam: Exam) {
    if (
      !window.confirm(
        `Công bố bài kiểm tra “${exam.title}”? Sinh viên sẽ nhìn thấy bài theo lịch đã cấu hình.`,
      )
    )
      return;
    setPublishingId(exam.id);
    setError("");
    try {
      const updated = await examService.publishExam(exam.id);
      setExams((items) =>
        items.map((item) => (item.id === exam.id ? updated : item)),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể công bố bài kiểm tra",
      );
    } finally {
      setPublishingId("");
    }
  }

  async function remove(exam: Exam) {
    if (!window.confirm(`Xóa bài kiểm tra “${exam.title}”?`)) return;
    try {
      await examService.deleteExam(exam.id);
      setExams((items) => items.filter((item) => item.id !== exam.id));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa bài kiểm tra",
      );
    }
  }

  const visibleExams = exams.filter((exam) => {
    const matchesStatus =
      statusFilter === "ALL" || exam.status === statusFilter;
    const matchesQuery = matchesSearchKeyword(exam.keyword, submittedQuery);
    return matchesStatus && matchesQuery;
  });
  const totalPages = Math.max(1, Math.ceil(visibleExams.length / pageSize));
  const pagedExams = visibleExams.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <AssessmentShell>
      <PageHeading title="Bài kiểm tra" />
      <div className="flex max-h-[calc(100dvh-106px)] min-h-0 w-full flex-col overflow-hidden">
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-2.5 shadow-card">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(220px,360px)_180px]">
              <DebouncedSearchInput
                className="!h-[42px] !rounded-lg focus:!ring-0"
                value={query}
                onValueChange={setQuery}
                onSearch={(value) => {
                  setPage(1);
                  setSubmittedQuery(value);
                }}
                placeholder="Tìm theo tên bài, môn học hoặc lớp"
              />
              <CustomSelect
                value={statusFilter}
                options={[
                  { value: "ALL", label: "Tất cả trạng thái" },
                  { value: "DRAFT", label: "Bản nháp" },
                  { value: "SCHEDULED", label: "Sắp diễn ra" },
                  { value: "ONGOING", label: "Đang diễn ra" },
                  { value: "ENDED", label: "Đã kết thúc" },
                ]}
                buttonClassName="!h-[42px] !rounded-lg !ring-0"
                ariaLabel="Lọc theo trạng thái"
                onValueChange={(value) => {
                  setStatusFilter(value as "ALL" | Exam["status"]);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex shrink-0 flex-nowrap justify-end gap-2">
              <Button
                className="!h-[42px] !rounded-lg"
                onClick={() => router.push("/teacher/exams/new")}
              >
                <Plus className="size-4" /> Tạo mới
              </Button>
            </div>
          </div>
        </div>

        <section className="mt-2 flex min-h-0 shrink flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
          {error ? (
            <div className="m-4">
              <ErrorPanel message={error} />
            </div>
          ) : null}
          <div className="min-h-0 shrink overflow-auto">
          <Table className="min-w-[1280px] [&_button]:!text-[13px] [&_p]:!text-[13px] [&_span]:!text-[13px]">
            <TableHeader className="sticky top-0 z-10 !bg-brand-600 !text-white">
              <tr>
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>Bài kiểm tra</TableHead>
                <TableHead>Môn học / Lớp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Câu hỏi</TableHead>
                <TableHead className="text-center">Tổng điểm</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Lịch mở / đóng</TableHead>
                <TableHead className="w-44 text-right">Thao tác</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? <TableLoadingBarRow colSpan={9} /> : null}
              {!loading && visibleExams.length === 0 ? (
                <TableEmptyRow
                  colSpan={9}
                  icon={<FileQuestion className="size-5 text-slate-400" />}
                  message={
                    exams.length === 0
                      ? "Chưa có bài kiểm tra"
                      : "Không tìm thấy bài kiểm tra phù hợp"
                  }
                />
              ) : null}
              {!loading
                ? pagedExams.map((exam, index) => (
                    <tr
                      key={exam.id}
                      className="cursor-pointer transition hover:bg-slate-50/70"
                      onClick={() => router.push(`/teacher/exams/${exam.id}`)}
                    >
                      <TableCell className="text-center text-[13px] text-slate-400">
                        {(page - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/teacher/exams/${exam.id}`);
                          }}
                          className="max-w-80 text-left font-bold text-slate-900 hover:text-brand-700 hover:underline"
                        >
                          {exam.title}
                        </button>
                        {!exam.published ? (
                          <p className="mt-1 text-[13px] font-semibold text-amber-600">
                            Có thể chỉnh sửa
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-800">{exam.subjectName}</p>
                        <p className="mt-1 text-[13px] text-slate-400">
                          {formatClassLabel(
                            assignedClasses,
                            exam.classId,
                            exam.className,
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[13px] font-black ${statusClass(exam.status)}`}>
                          {EXAM_STATUS_LABELS[exam.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {exam.questions.length}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {exam.totalPoints}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-semibold">{exam.settings.durationMinutes} phút</p>
                        <p className="mt-1 text-[13px] text-slate-400">
                          {exam.settings.attemptsAllowed} lượt làm
                        </p>
                      </TableCell>
                      <TableCell className="min-w-52 whitespace-nowrap text-[13px]">
                        <p className="flex items-center gap-1.5 text-slate-600">
                          <CalendarClock className="size-3.5 text-brand-500" />
                          {formatExamDate(exam.settings.startsAt)}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-slate-600">
                          <Clock3 className="size-3.5 text-rose-400" />
                          {formatExamDate(exam.settings.endsAt)}
                        </p>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/teacher/exams/${exam.id}`)}
                            aria-label={`Xem chi tiết ${exam.title}`}
                            title="Xem chi tiết"
                          >
                            <Eye size={18} strokeWidth={2.5} />
                          </Button>
                          {!exam.published ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditor(exam.id)}
                                aria-label={`Chỉnh sửa ${exam.title}`}
                                title="Chỉnh sửa"
                              >
                                <Edit3 size={18} strokeWidth={2.5} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-brand-700"
                                onClick={() => void publish(exam)}
                                disabled={publishingId === exam.id}
                                aria-label={`Công bố ${exam.title}`}
                                title="Công bố"
                              >
                                <Send size={18} strokeWidth={2.5} />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-brand-700"
                              onClick={() => router.push(`/teacher/exams/${exam.id}/submissions`)}
                              aria-label={`Xem bài nộp của ${exam.title}`}
                              title="Bài nộp"
                            >
                              <FileCheck2 size={18} strokeWidth={2.5} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => void remove(exam)}
                            aria-label={`Xóa ${exam.title}`}
                            title="Xóa"
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
            className="shrink-0 bg-white text-[13px] [&_*]:!text-[13px]"
            rowCount={pagedExams.length}
            totalItems={visibleExams.length}
            itemLabel="bài kiểm tra"
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

      <Modal
        open={isEditorOpen}
        title="Chỉnh sửa bài kiểm tra"
        description="Cập nhật các bước thiết lập và lưu thay đổi ngay tại đây."
        onClose={closeEditor}
        width="max-w-[1500px]"
        bodyClassName="max-h-[calc(100dvh-9rem)] overflow-y-auto !p-4 sm:!p-5"
      >
        <ExamWizardPage
          key={editingExamId ?? "edit-exam"}
          examId={editingExamId ?? undefined}
          embedded
          onClose={closeEditor}
          onSaved={async () => {
            closeEditor();
            await load();
          }}
        />
      </Modal>
      </div>
    </AssessmentShell>
  );
}

export function ExamWizardPage({
  examId,
  embedded = false,
  onClose,
  onSaved,
}: {
  examId?: string;
  embedded?: boolean;
  onClose?: () => void;
  onSaved?: (exam: Exam) => void | Promise<void>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<ExamQuestion[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [publishedExam, setPublishedExam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<TeacherAssignedClass[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [info, setInfo] = useState({
    title: "",
    subjectId: "",
    subjectName: "",
    classId: "",
    className: "",
    topicName: "",
    description: "",
  });
  const [settings, setSettings] = useState<ExamSettings>(createBlankSettings);

  useEffect(() => {
    const examRequest = examId
      ? examService.getExamById(examId)
      : Promise.resolve(null);
    const settingsRequest = examId
      ? Promise.resolve(null)
      : teacherSettingsService.getExamDefaults();
    void Promise.all([
      academicDataService.getSubjects(),
      academicDataService.getTeacherAssignedClasses(),
      examRequest,
      settingsRequest,
    ])
      .then(([loadedSubjects, loadedClasses, exam, teacherSettings]) => {
        const assignedSubjectIds = new Set(
          loadedClasses.flatMap((schoolClass) =>
            schoolClass.subjects.map((subject) => subject.id),
          ),
        );
        const assignedSubjects = loadedSubjects.filter((subject) =>
          assignedSubjectIds.has(subject.id),
        );
        setSubjects(assignedSubjects);
        setClasses(loadedClasses);
        if (exam) {
          setPublishedExam(exam.published);
          setInfo({
            title: exam.title,
            subjectId: exam.subjectId,
            subjectName: exam.subjectName,
            classId: exam.classId,
            className: exam.className,
            topicName: exam.topicName,
            description: exam.description,
          });
          setSettings({
            ...exam.settings,
            startsAt: toDateTimeLocal(exam.settings.startsAt),
            endsAt: toDateTimeLocal(exam.settings.endsAt),
          });
          setSelected(
            [...exam.questions].sort((left, right) => left.order - right.order),
          );
          return;
        }
        if (teacherSettings) {
          setSettings(createBlankSettings(teacherSettings.examDefaults));
        }
        const firstClass = loadedClasses[0];
        const firstSubject = assignedSubjects.find(
          (subject) => subject.id === firstClass?.subjects[0]?.id,
        );
        if (firstSubject)
          setInfo((current) => ({
            ...current,
            subjectId: firstSubject.id,
            subjectName: getVietnameseSubjectName(firstSubject),
          }));
        if (firstClass)
          setInfo((current) => ({
            ...current,
            classId: firstClass.id,
            className: firstClass.name,
          }));
        if (!firstClass || !firstSubject) {
          setError(
            "Bạn chưa được phân công môn học và lớp để tạo bài kiểm tra.",
          );
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải dữ liệu học vụ",
        ),
      )
      .finally(() => setInitializing(false));
  }, [examId]);

  useEffect(() => {
    if (!info.subjectId) return;
    void academicDataService
      .getTopics(info.subjectId)
      .then((loadedTopics) => {
        setTopics(loadedTopics);
        setInfo((current) => ({
          ...current,
          topicName:
            loadedTopics.find((topic) => topic.name === current.topicName)
              ?.name ??
            loadedTopics[0]?.name ??
            "",
        }));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải chủ đề",
        ),
      );
  }, [info.subjectId]);

  useEffect(() => {
    if (!info.subjectId) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    void questionBankService
      .getQuestions({ subjectId: info.subjectId })
      .then(setQuestions)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Không thể tải câu hỏi",
        ),
      )
      .finally(() => setLoadingQuestions(false));
  }, [info.subjectId]);

  const availableClasses = classes.filter((schoolClass) =>
    schoolClass.subjects.some((subject) => subject.id === info.subjectId),
  );
  const currentClassLabel = formatClassLabel(
    classes,
    info.classId,
    info.className,
  );

  function updateInfo(key: keyof typeof info, value: string) {
    setInfo((current) => ({ ...current, [key]: value }));
  }
  function chooseSubject(value: string) {
    const subject = subjects.find((item) => item.id === value);
    if (!subject) return;
    const firstCompatibleClass = classes.find((schoolClass) =>
      schoolClass.subjects.some((item) => item.id === subject.id),
    );
    setInfo((current) => ({
      ...current,
      subjectId: subject.id,
      subjectName: getVietnameseSubjectName(subject),
      classId: firstCompatibleClass?.id ?? "",
      className: firstCompatibleClass?.name ?? "",
      topicName: "",
    }));
    setSelected([]);
    setSearch("");
  }

  function normalizeOrder(items: ExamQuestion[]): ExamQuestion[] {
    return items.map((item, order) => ({ ...item, order }));
  }

  function toggleQuestion(question: Question) {
    setSelected((items) =>
      items.some((item) => item.questionId === question.id)
        ? normalizeOrder(
            items.filter((item) => item.questionId !== question.id),
          )
        : [
            ...items,
            {
              questionId: question.id,
              points: question.defaultPoints,
              order: items.length,
            },
          ],
    );
  }

  function updateQuestionPoints(questionId: string, points: number) {
    setSelected((items) =>
      items.map((item) =>
        item.questionId === questionId
          ? { ...item, points: Math.max(0, points) }
          : item,
      ),
    );
  }

  function moveQuestion(questionId: string, direction: -1 | 1) {
    setSelected((items) => {
      const currentIndex = items.findIndex(
        (item) => item.questionId === questionId,
      );
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length)
        return items;
      const reordered = [...items];
      [reordered[currentIndex], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[currentIndex],
      ];
      return normalizeOrder(reordered);
    });
  }

  const filteredQuestions = questions.filter(
    (question) =>
      !question.disabled &&
      question.subjectId === info.subjectId &&
      matchesSearchKeyword(question.keyword, search),
  );
  const selectedQuestionObjects = selected
    .map((item) => ({
      ...item,
      question: questions.find((question) => question.id === item.questionId),
    }))
    .filter((item) => item.question);
  function canNext() {
    if (step === 1 && !info.title.trim()) {
      setError("Vui lòng nhập tên bài kiểm tra");
      return false;
    }
    if (step === 1 && (!info.subjectId || !info.classId)) {
      setError("Vui lòng chọn môn học và lớp được phân công");
      return false;
    }
    if (
      step === 1 &&
      topics.length > 0 &&
      !topics.some((topic) => topic.name === info.topicName)
    ) {
      setError("Vui lòng chọn chủ đề từ dữ liệu học vụ");
      return false;
    }
    if (step === 2 && selected.length === 0) {
      setError("Hãy chọn ít nhất một câu hỏi");
      return false;
    }
    if (step === 2 && selected.some((item) => item.points <= 0)) {
      setError("Điểm của mỗi câu hỏi phải lớn hơn 0");
      return false;
    }
    if (step === 3) {
      const startsAt = new Date(settings.startsAt).getTime();
      const endsAt = new Date(settings.endsAt).getTime();
      if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
        setError("Vui lòng nhập đầy đủ thời gian mở và đóng bài");
        return false;
      }
      if (startsAt >= endsAt) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu");
        return false;
      }
      if (settings.durationMinutes <= 0 || settings.attemptsAllowed <= 0) {
        setError("Thời lượng và số lần làm bài phải lớn hơn 0");
        return false;
      }
    }
    return true;
  }

  async function save(publishAfterSave = false) {
    setSaving(true);
    setError("");
    const payload: ExamInput = {
      ...info,
      questions: normalizeOrder(selected),
      settings: {
        ...settings,
        startsAt: new Date(settings.startsAt).toISOString(),
        endsAt: new Date(settings.endsAt).toISOString(),
      },
    };
    try {
      let savedExam: Exam;
      if (examId) {
        savedExam = await examService.updateExam(examId, payload);
      } else {
        savedExam = await examService.createExam(payload);
      }
      if (publishAfterSave) {
        savedExam = await examService.publishExam(savedExam.id);
      }
      if (onSaved) await onSaved(savedExam);
      else router.push("/teacher/exams");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu bài kiểm tra",
      );
    } finally {
      setSaving(false);
    }
  }

  if (initializing)
    return (
      <ExamWizardFrame embedded={embedded}>
        <LoadingPanel />
      </ExamWizardFrame>
    );

  if (publishedExam)
    return (
      <ExamWizardFrame embedded={embedded}>
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <FileCheck2 className="mx-auto size-10 text-amber-600" />
          <h1 className="mt-3 text-xl font-black text-slate-950">
            Bài kiểm tra đã được công bố
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Chỉ bản nháp chưa công bố mới có thể chỉnh sửa nội dung và câu hỏi.
          </p>
          <Button
            className="mt-5"
            onClick={() =>
              onClose ? onClose() : router.push("/teacher/exams")
            }
          >
            <ArrowLeft className="size-4" /> Quay lại danh sách
          </Button>
        </div>
      </ExamWizardFrame>
    );

  return (
    <ExamWizardFrame embedded={embedded}>
      {!embedded ? (
        <PageHeading
          title={examId ? "Chỉnh sửa bài kiểm tra" : "Tạo bài kiểm tra"}
        />
      ) : null}

      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {wizardSteps.map(({ label, description, icon: Icon }, index) => {
          const stepNumber = index + 1;
          const active = step === stepNumber;
          const completed = step > stepNumber;
          return (
            <button
              type="button"
              key={label}
              onClick={() => completed && setStep(stepNumber)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-brand-500 bg-brand-600 text-white shadow-md shadow-brand-600/15" : completed ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-slate-200 bg-white text-slate-400"}`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white/15" : completed ? "bg-white" : "bg-slate-50"}`}
              >
                {completed ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <span>
                <span className="block text-xs font-black">
                  {stepNumber}. {label}
                </span>
                <span
                  className={`mt-0.5 block text-[11px] ${active ? "text-blue-100" : "opacity-70"}`}
                >
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <div className="mb-5">
          <ErrorPanel message={error} />
        </div>
      ) : null}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          {step === 1 ? (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-950">
                  Thông tin chung
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chọn đúng môn và lớp mà bạn được phân công giảng dạy.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    label="Tên bài kiểm tra"
                    required
                    value={info.title}
                    onChange={(event) =>
                      updateInfo("title", event.target.value)
                    }
                    placeholder="Ví dụ: Kiểm tra giữa kỳ React"
                    hint="Tên ngắn gọn, giúp sinh viên dễ nhận biết."
                  />
                </div>
                <Select
                  label="Môn học"
                  required
                  value={info.subjectId}
                  onChange={(event) => chooseSubject(event.target.value)}
                >
                  <option value="">Chọn môn được phân công</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {getVietnameseSubjectName(subject)}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Lớp học"
                  required
                  value={info.classId}
                  onChange={(event) => {
                    const item =
                      availableClasses.find(
                        (value) => value.id === event.target.value,
                      ) ?? availableClasses[0];
                    if (!item) return;
                    setInfo((current) => ({
                      ...current,
                      classId: item.id,
                      className: item.name,
                    }));
                  }}
                >
                  <option value="">Chọn lớp được phân công</option>
                  {availableClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Chủ đề"
                  value={info.topicName}
                  onChange={(event) =>
                    updateInfo("topicName", event.target.value)
                  }
                >
                  <option value="">Chọn chủ đề</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.name}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
                <div className="md:col-span-2">
                  <Textarea
                    label="Mô tả"
                    value={info.description}
                    onChange={(event) =>
                      updateInfo("description", event.target.value)
                    }
                    rows={4}
                    placeholder="Mục tiêu, phạm vi kiến thức hoặc lưu ý cho sinh viên..."
                  />
                </div>
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-black">
                    Xây dựng danh sách câu hỏi
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Chỉ hiển thị câu hỏi thuộc môn{" "}
                    {info.subjectName || "đã chọn"}.
                  </p>
                </div>
                <Input
                  icon={Search}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm nội dung hoặc chủ đề..."
                  className="sm:w-72"
                />
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-800">
                      Ngân hàng câu hỏi
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      {filteredQuestions.length} câu
                    </span>
                  </div>
                  <div className="max-h-[520px] space-y-2 overflow-y-auto p-3">
                    {loadingQuestions ? (
                      <div className="py-12 text-center text-sm text-slate-400">
                        Đang tải câu hỏi...
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="py-12 text-center">
                        <FileQuestion className="mx-auto size-8 text-slate-300" />
                        <p className="mt-2 text-sm font-bold text-slate-600">
                          Chưa có câu hỏi phù hợp
                        </p>
                        <Link
                          href="/teacher/question-bank/new"
                          className="mt-2 inline-block text-xs font-bold text-brand-600 hover:text-brand-800"
                        >
                          Tạo câu hỏi cho môn này
                        </Link>
                      </div>
                    ) : (
                      filteredQuestions.map((question) => {
                        const chosen = selected.some(
                          (item) => item.questionId === question.id,
                        );
                        return (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => toggleQuestion(question)}
                            className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${chosen ? "border-brand-300 bg-brand-50 ring-1 ring-brand-100" : "border-slate-100 hover:border-brand-200 hover:bg-slate-50"}`}
                          >
                            <span
                              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${chosen ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"}`}
                            >
                              {chosen ? <Check className="size-4" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 block text-sm font-bold leading-5 text-slate-800">
                                {question.content}
                              </span>
                              <span className="mt-1.5 block text-[11px] font-medium text-slate-500">
                                {question.topicName || "Chưa phân chủ đề"} ·{" "}
                                {question.defaultPoints} điểm
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-brand-100 bg-brand-50/30">
                  <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50 px-4 py-3">
                    <p className="text-sm font-black text-brand-900">
                      Đề đã chọn
                    </p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700">
                      {selected.length} câu ·{" "}
                      {selected.reduce((sum, item) => sum + item.points, 0)}{" "}
                      điểm
                    </span>
                  </div>
                  <div className="max-h-[520px] space-y-2 overflow-y-auto p-3">
                    {selectedQuestionObjects.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-400">
                        Chọn câu hỏi từ danh sách bên trái để xây dựng đề.
                      </div>
                    ) : (
                      selectedQuestionObjects.map(
                        ({ question, points }, index) => (
                          <div
                            key={question!.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <div className="flex items-start gap-2">
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white">
                                {index + 1}
                              </span>
                              <p className="line-clamp-2 min-w-0 flex-1 text-sm font-bold leading-5 text-slate-800">
                                {question!.content}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleQuestion(question!)}
                                className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Bỏ câu hỏi"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
                              <Input
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={points}
                                onChange={(event) =>
                                  updateQuestionPoints(
                                    question!.id,
                                    Number(event.target.value),
                                  )
                                }
                                className="h-8 w-24"
                                aria-label={`Điểm câu ${index + 1}`}
                              />
                              <span className="mr-auto text-[11px] font-semibold text-slate-400">
                                điểm
                              </span>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveQuestion(question!.id, -1)}
                                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                aria-label="Đưa câu hỏi lên"
                              >
                                <ArrowUp className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={
                                  index === selectedQuestionObjects.length - 1
                                }
                                onClick={() => moveQuestion(question!.id, 1)}
                                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                                aria-label="Đưa câu hỏi xuống"
                              >
                                <ArrowDown className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-950">
                  Cấu hình làm bài
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Thiết lập thời gian mở đề, thời lượng và quyền xem kết quả.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  label="Thời gian bắt đầu"
                  type="datetime-local"
                  value={settings.startsAt}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Thời gian kết thúc"
                  type="datetime-local"
                  value={settings.endsAt}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Thời lượng (phút)"
                  type="number"
                  min="1"
                  value={settings.durationMinutes}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                />
                <Input
                  label="Số lần được phép"
                  type="number"
                  min="1"
                  value={settings.attemptsAllowed}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      attemptsAllowed: Number(event.target.value),
                    }))
                  }
                />
                <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                  {(
                    [
                      ["shuffleQuestions", "Trộn thứ tự câu hỏi"],
                      ["shuffleAnswers", "Trộn đáp án"],
                      [
                        "showScoreImmediately",
                        "Hiển thị điểm ngay sau khi nộp",
                      ],
                      ["showCorrectAnswers", "Cho xem đáp án đúng"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/40"
                    >
                      <input
                        type="checkbox"
                        checked={settings[key]}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                        className="size-4 accent-brand-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-950">
                  Kiểm tra trước khi lưu
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rà soát nội dung, điểm số và lịch làm bài trước khi công bố.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-brand-900 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">
                      Bản xem trước
                    </p>
                    <h2 className="mt-2 text-2xl font-black">{info.title}</h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {info.subjectName} · {currentClassLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                    Chưa công bố
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] text-slate-400">Số câu</p>
                    <p className="mt-1 font-black">{selected.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Tổng điểm</p>
                    <p className="mt-1 font-black">
                      {selected.reduce((sum, item) => sum + item.points, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Thời lượng</p>
                    <p className="mt-1 font-black">
                      {settings.durationMinutes} phút
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Lượt làm</p>
                    <p className="mt-1 font-black">
                      {settings.attemptsAllowed} lần
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2 text-slate-600">
                  <CalendarClock className="size-4 text-brand-600" /> Mở:{" "}
                  <strong>{formatExamDate(settings.startsAt)}</strong>
                </p>
                <p className="flex items-center gap-2 text-slate-600">
                  <Clock3 className="size-4 text-rose-500" /> Đóng:{" "}
                  <strong>{formatExamDate(settings.endsAt)}</strong>
                </p>
              </div>
              <div className="mt-5 space-y-3">
                {selectedQuestionObjects.map(({ question, points }, index) => (
                  <div
                    key={question!.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 p-4"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-black text-brand-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">
                        {question!.content}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {points} điểm · {question!.options.length} đáp án
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-7 flex justify-between border-t border-slate-100 pt-5">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                setError("");
                if (step === 1) {
                  if (onClose) onClose();
                  else router.push("/teacher/exams");
                }
                else setStep((value) => value - 1);
              }}
            >
              {step === 1 ? "Hủy" : "Quay lại"}
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => {
                  if (canNext()) {
                    setError("");
                    setStep((value) => value + 1);
                  }
                }}
              >
                Tiếp theo <ChevronRight className="size-4" />
              </Button>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => void save(false)}
                  disabled={saving}
                >
                  <FileCheck2 className="size-4" />
                  {saving
                    ? "Đang lưu..."
                    : examId
                      ? "Lưu thay đổi"
                      : "Lưu bản nháp"}
                </Button>
                <Button onClick={() => void save(true)} disabled={saving}>
                  <Send className="size-4" />
                  {saving ? "Đang xử lý..." : "Lưu và công bố"}
                </Button>
              </div>
            )}
          </div>
        </section>
        <aside className="sticky top-20 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card xl:block">
          <div className="border-b border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">
              Tóm tắt bài kiểm tra
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cập nhật theo nội dung đang nhập
            </p>
          </div>
          <div className="space-y-4 p-4 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Tên bài
              </p>
              <p className="mt-1 line-clamp-2 font-bold text-slate-800">
                {info.title || "Chưa đặt tên"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-brand-50 p-3">
                <p className="text-[11px] text-brand-600">Câu hỏi</p>
                <p className="mt-1 text-lg font-black text-brand-800">
                  {selected.length}
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-[11px] text-violet-600">Tổng điểm</p>
                <p className="mt-1 text-lg font-black text-violet-800">
                  {selected.reduce((sum, item) => sum + item.points, 0)}
                </p>
              </div>
            </div>
            <dl className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Môn học</dt>
                <dd className="max-w-36 truncate font-bold">
                  {info.subjectName || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Lớp</dt>
                <dd className="max-w-36 truncate font-bold">
                  {currentClassLabel || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Thời lượng</dt>
                <dd className="font-bold">{settings.durationMinutes} phút</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Số lượt làm</dt>
                <dd className="font-bold">{settings.attemptsAllowed}</dd>
              </div>
            </dl>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Bạn có thể tiếp tục chỉnh sửa khi bài vẫn ở trạng thái bản nháp.
            </div>
          </div>
        </aside>
      </div>
    </ExamWizardFrame>
  );
}

export function ExamEditPage() {
  const params = useParams<{ id: string }>();
  return <ExamWizardPage examId={params.id} />;
}

export function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([
      examService.getExamById(params.id),
      questionBankService.getQuestions(),
    ])
      .then(([loadedExam, loadedQuestions]) => {
        setExam(loadedExam);
        setQuestions(loadedQuestions);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Không thể tải đề"),
      );
  }, [params.id]);
  if (error)
    return (
      <AssessmentShell>
        <ErrorPanel message={error} />
      </AssessmentShell>
    );
  if (!exam)
    return (
      <AssessmentShell>
        <LoadingPanel />
      </AssessmentShell>
    );

  const orderedQuestions = [...exam.questions].sort(
    (left, right) => left.order - right.order,
  );

  return (
    <AssessmentShell>
      <PageHeading
        eyebrow="Exam detail"
        title={exam.title}
        description={`${exam.subjectName} · ${exam.className}`}
      />
      <div className="mx-auto max-w-[1180px] space-y-3">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/teacher/exams")}
          >
            <ArrowLeft className="size-4" /> Quay lại
          </Button>
        </div>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="relative overflow-hidden px-4 py-4 sm:px-5">
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand-100/50 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
                <FileCheck2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusClass(exam.status)}`}
                  >
                    {EXAM_STATUS_LABELS[exam.status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                    {exam.published ? "Đã công bố" : "Bản nháp"}
                  </span>
                </div>
                <h2 className="mt-2 truncate text-xl font-black text-slate-950">
                  {exam.title}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="size-4 text-brand-500" />
                    {exam.subjectName}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="size-4 text-brand-500" />
                    {exam.className}
                  </span>
                </div>
                {exam.description ? (
                  <p className="mt-2 max-w-3xl whitespace-pre-wrap text-[13px] leading-5 text-slate-500">
                    {exam.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/60 sm:grid-cols-4">
            <div className="border-b border-r border-slate-100 px-4 py-2.5 sm:border-b-0">
              <p className="text-[11px] font-semibold text-slate-400">Câu hỏi</p>
              <p className="mt-0.5 text-base font-black text-slate-900">
                {exam.questions.length}
              </p>
            </div>
            <div className="border-b border-slate-100 px-4 py-2.5 sm:border-b-0 sm:border-r">
              <p className="text-[11px] font-semibold text-slate-400">Tổng điểm</p>
              <p className="mt-0.5 text-base font-black text-slate-900">
                {exam.totalPoints}
              </p>
            </div>
            <div className="border-r border-slate-100 px-4 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400">Thời lượng</p>
              <p className="mt-0.5 text-base font-black text-slate-900">
                {exam.settings.durationMinutes} phút
              </p>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400">Lượt làm</p>
              <p className="mt-0.5 text-base font-black text-slate-900">
                {exam.settings.attemptsAllowed}
              </p>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <ListChecks className="size-4" />
                </span>
                <h2 className="font-black text-slate-900">
                  Danh sách câu hỏi
                </h2>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-700">
                {orderedQuestions.length} câu
              </span>
            </div>

            {orderedQuestions.length === 0 ? (
              <div className="grid min-h-48 place-items-center px-5 py-10 text-center">
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
                    <FileQuestion className="size-5" />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-slate-500">
                    Bài kiểm tra chưa có câu hỏi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3 sm:p-4">
                {orderedQuestions.map((item, index) => {
                  const question = questions.find(
                    (value) => value.id === item.questionId,
                  );
                  return (
                    <article
                      key={item.questionId}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-200 hover:bg-brand-50/20"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-[13px] font-black text-brand-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold leading-6 text-slate-900">
                          {question?.content ?? `Câu hỏi ${item.questionId}`}
                        </p>
                        {question ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5">
                              {QUESTION_TYPE_LABELS[question.type]}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5">
                              {DIFFICULTY_LABELS[question.difficulty]}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-black text-violet-700">
                        {item.points} điểm
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-3 lg:sticky lg:top-20">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <CalendarClock className="size-4" />
                </span>
                <h2 className="font-black text-slate-900">Lịch làm bài</h2>
              </div>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <CalendarClock className="size-3.5 text-brand-500" /> Bắt đầu
                  </p>
                  <p className="mt-1.5 text-[13px] font-bold text-slate-800">
                    {formatExamDate(exam.settings.startsAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Clock3 className="size-3.5 text-rose-400" /> Kết thúc
                  </p>
                  <p className="mt-1.5 text-[13px] font-bold text-slate-800">
                    {formatExamDate(exam.settings.endsAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <Settings2 className="size-4" />
                </span>
                <h2 className="font-black text-slate-900">Cấu hình bài thi</h2>
              </div>
              <dl className="mt-3 divide-y divide-slate-100 text-[13px]">
                <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <dt className="text-slate-500">Xáo trộn câu hỏi</dt>
                  <dd className="font-bold text-slate-800">
                    {exam.settings.shuffleQuestions ? "Có" : "Không"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-slate-500">Xáo trộn đáp án</dt>
                  <dd className="font-bold text-slate-800">
                    {exam.settings.shuffleAnswers ? "Có" : "Không"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
                  <dt className="text-slate-500">Hiện điểm sau khi nộp</dt>
                  <dd className="font-bold text-slate-800">
                    {exam.settings.showScoreImmediately ? "Có" : "Không"}
                  </dd>
                </div>
              </dl>

              {!exam.published ? (
                <Button
                  className="mt-4 w-full"
                  onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)}
                >
                  <Edit3 className="size-4" /> Chỉnh sửa bản nháp
                </Button>
              ) : (
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={() =>
                    router.push(`/teacher/exams/${exam.id}/submissions`)
                  }
                >
                  <FileCheck2 className="size-4" /> Xem bài nộp
                </Button>
              )}
            </section>
          </aside>
        </div>
      </div>
    </AssessmentShell>
  );
}
