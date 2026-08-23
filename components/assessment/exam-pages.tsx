"use client";

import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight, Eye, FilePenLine, GripVertical, Library, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AssessmentShell, ErrorPanel, LoadingPanel, PageHeading } from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { Input, Select } from "@/components/ui/form-control";
import { Table, TableBody, TableCell, TableEmptyRow, TableHead, TableHeader } from "@/components/ui/data-table";
import { academicDataService, examService, questionBankService } from "@/lib/assessment-api";
import { DIFFICULTY_LABELS, EXAM_STATUS_LABELS, QUESTION_TYPE_LABELS, type Difficulty, type Exam, type ExamInput, type ExamQuestion, type ExamSettings, type Question, type QuestionInput, type QuestionType, type TeacherAssignedClass, type Topic } from "@/types/assessment";

function toDateTimeLocal(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialSettings(): ExamSettings {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  startsAt.setSeconds(0, 0);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  return { startsAt: toDateTimeLocal(startsAt), endsAt: toDateTimeLocal(endsAt), durationMinutes: 45, attemptsAllowed: 1, shuffleQuestions: false, shuffleAnswers: false, showScoreImmediately: true, showCorrectAnswers: true };
}

function statusClass(status: Exam["status"]): string {
  return { DRAFT: "bg-slate-100 text-slate-600", SCHEDULED: "bg-amber-50 text-amber-700", ONGOING: "bg-emerald-50 text-emerald-700", ENDED: "bg-blue-50 text-blue-700" }[status];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

export function TeacherExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void examService.getExams().then(setExams).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải bài kiểm tra")).finally(() => setLoading(false));
  }, []);

  async function publish(exam: Exam) {
    setError("");
    try {
      const updated = await examService.publishExam(exam.id);
      setExams((items) => items.map((item) => item.id === exam.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể giao bài kiểm tra");
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      await examService.deleteExam(pendingDelete.id);
      setExams((items) => items.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa bài kiểm tra");
    } finally {
      setDeleting(false);
    }
  }

  return <AssessmentShell>
    <PageHeading eyebrow="Teacher workspace" title="Bài kiểm tra" description="Tạo đề, giao đúng lớp và môn được phân công, theo dõi bài làm của học sinh." action={<Link href="/teacher/exams/new"><Button>+ Tạo bài kiểm tra</Button></Link>} />
    {error ? <div className="mb-5"><ErrorPanel message={error} /></div> : null}
    {loading ? <LoadingPanel /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <Table className="min-w-[1120px]">
        <TableHeader><tr><TableHead>Bài kiểm tra</TableHead><TableHead>Lớp / Môn</TableHead><TableHead>Câu hỏi</TableHead><TableHead>Thời lượng</TableHead><TableHead>Thời gian mở</TableHead><TableHead>Trạng thái</TableHead><TableHead>Đã làm</TableHead><TableHead className="text-right">Thao tác</TableHead></tr></TableHeader>
        <TableBody>
          {exams.length === 0 ? <TableEmptyRow colSpan={8} message="Chưa có bài kiểm tra." /> : exams.map((exam) => <tr key={exam.id}>
            <TableCell><p className="max-w-56 truncate font-bold text-slate-900">{exam.title}</p><p className="mt-1 max-w-56 truncate text-xs text-slate-400">{exam.description || "Không có mô tả"}</p></TableCell>
            <TableCell><p className="font-semibold text-slate-800">{exam.className}</p><p className="mt-1 text-xs text-slate-500">{exam.subjectName}</p></TableCell>
            <TableCell>{exam.questions.length} câu · {exam.totalPoints} điểm</TableCell>
            <TableCell>{exam.settings.durationMinutes} phút</TableCell>
            <TableCell><p>{formatDate(exam.settings.startsAt)}</p><p className="mt-1 text-xs text-slate-400">đến {formatDate(exam.settings.endsAt)}</p></TableCell>
            <TableCell><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${statusClass(exam.status)}`}>{EXAM_STATUS_LABELS[exam.status]}</span></TableCell>
            <TableCell className="font-bold">{exam.attemptedCount ?? 0} học sinh</TableCell>
            <TableCell><div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => router.push(`/teacher/exams/${exam.id}`)} aria-label="Xem chi tiết"><Eye className="size-4" /></Button>
              <Button size="sm" variant="ghost" disabled={(exam.attemptedCount ?? 0) > 0} onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)} aria-label="Chỉnh sửa"><FilePenLine className="size-4" /></Button>
              {exam.published ? <Button size="sm" variant="secondary" onClick={() => router.push(`/teacher/exams/${exam.id}/submissions`)}>Kết quả</Button> : <Button size="sm" onClick={() => void publish(exam)}>Giao bài</Button>}
              <Button size="sm" variant="ghost" disabled={(exam.attemptedCount ?? 0) > 0} onClick={() => setPendingDelete(exam)} aria-label="Xóa"><Trash2 className="size-4 text-rose-600" /></Button>
            </div></TableCell>
          </tr>)}
        </TableBody>
      </Table>
    </div>}
    <ConfirmationDialog open={Boolean(pendingDelete)} title="Xóa bài kiểm tra" onClose={() => setPendingDelete(null)} onConfirm={() => void remove()} loading={deleting} confirmLabel="Xóa bài" confirmVariant="danger">
      Bạn có chắc muốn xóa “{pendingDelete?.title}”? Thao tác chỉ được phép khi chưa có học sinh làm bài.
    </ConfirmationDialog>
  </AssessmentShell>;
}

interface ExamFormInfo {
  title: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  topicName: string;
  description: string;
}

const emptyInfo: ExamFormInfo = { title: "", subjectId: "", subjectName: "", classId: "", className: "", topicName: "", description: "" };

const defaultQuestionOptions = [
  { id: "a", label: "A", text: "" },
  { id: "b", label: "B", text: "" },
  { id: "c", label: "C", text: "" },
  { id: "d", label: "D", text: "" },
];

function emptyManualQuestion(): QuestionInput {
  return {
    subjectId: "",
    subjectName: "",
    topicId: "",
    topicName: "",
    content: "",
    type: "SINGLE_CHOICE",
    difficulty: "MEDIUM",
    options: defaultQuestionOptions,
    correctOptionIds: [],
    defaultPoints: 1,
    explanation: "",
  };
}

export function ExamWizardPage({ examId }: { examId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [assignments, setAssignments] = useState<TeacherAssignedClass[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [selected, setSelected] = useState<ExamQuestion[]>([]);
  const [questionCache, setQuestionCache] = useState<Record<string, Question>>({});
  const [questionMode, setQuestionMode] = useState<"bank" | "manual">("bank");
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankSelection, setBankSelection] = useState<Set<string>>(new Set());
  const [bankSearchInput, setBankSearchInput] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [bankTopicId, setBankTopicId] = useState("");
  const [bankPage, setBankPage] = useState(1);
  const [bankHasNext, setBankHasNext] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [manualForm, setManualForm] = useState<QuestionInput>(emptyManualQuestion);
  const [manualQuestionIds, setManualQuestionIds] = useState<Set<string>>(new Set());
  const [editingManualId, setEditingManualId] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [info, setInfo] = useState<ExamFormInfo>(emptyInfo);
  const [settings, setSettings] = useState<ExamSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedClass = assignments.find((item) => item.id === info.classId);
  const availableSubjects = selectedClass?.subjects ?? [];

  useEffect(() => {
    const examRequest = examId ? examService.getExamById(examId) : Promise.resolve(null);
    void Promise.all([academicDataService.getTeacherAssignedClasses(), examRequest]).then(async ([loadedAssignments, exam]) => {
      setAssignments(loadedAssignments);
      if (exam) {
        setInfo({ title: exam.title, subjectId: exam.subjectId, subjectName: exam.subjectName, classId: exam.classId, className: exam.className, topicName: exam.topicName, description: exam.description });
        setSettings({ ...exam.settings, startsAt: toDateTimeLocal(exam.settings.startsAt), endsAt: toDateTimeLocal(exam.settings.endsAt) });
        setSelected([...exam.questions].sort((a, b) => a.order - b.order));
        const loadedQuestions = await Promise.all(exam.questions.map((item) => questionBankService.getQuestionById(item.questionId)));
        setQuestionCache(Object.fromEntries(loadedQuestions.map((question) => [question.id, question])));
        return;
      }
      const firstClass = loadedAssignments[0];
      const firstSubject = firstClass?.subjects[0];
      if (firstClass && firstSubject) setInfo((current) => ({ ...current, classId: firstClass.id, className: firstClass.name, subjectId: firstSubject.id, subjectName: firstSubject.name }));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu bài kiểm tra")).finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    if (!info.subjectId) { setTopics([]); setTopicId(""); return; }
    void academicDataService.getTopics(info.subjectId).then((loadedTopics) => {
      setTopics(loadedTopics);
      const selectedTopic = loadedTopics.find((topic) => topic.name === info.topicName);
      const nextTopicId = selectedTopic?.id ?? "";
      setTopicId(nextTopicId);
      setBankTopicId(nextTopicId);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải chủ đề"));
  }, [info.subjectId, info.topicName]);

  useEffect(() => {
    if (!info.subjectId) { setBankQuestions([]); return; }
    setBankLoading(true);
    void questionBankService.getQuestions({ subjectId: info.subjectId, topicId: bankTopicId || undefined, search: bankSearch || undefined, page: bankPage, limit: 10 }).then((items) => {
      setBankQuestions(items);
      setBankHasNext(items.length === 10);
      setQuestionCache((current) => ({ ...current, ...Object.fromEntries(items.map((question) => [question.id, question])) }));
      setBankSelection((current) => new Set([...current].filter((id) => items.some((question) => question.id === id))));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải ngân hàng câu hỏi")).finally(() => setBankLoading(false));
  }, [bankPage, bankSearch, bankTopicId, info.subjectId]);

  useEffect(() => {
    const topic = topics.find((item) => item.id === topicId) ?? topics[0];
    setManualForm((current) => ({ ...current, subjectId: info.subjectId, subjectName: info.subjectName, topicId: topic?.id ?? "", topicName: topic?.name ?? "" }));
  }, [info.subjectId, info.subjectName, topicId, topics]);

  const selectedQuestions = useMemo(() => selected.map((item) => ({ ...item, question: questionCache[item.questionId] })).filter((item) => item.question), [questionCache, selected]);

  function chooseClass(classId: string) {
    const schoolClass = assignments.find((item) => item.id === classId);
    const subject = schoolClass?.subjects[0];
    if (!schoolClass) return;
    setSelected([]);
    setQuestionCache({});
    setTopicId("");
    setBankPage(1);
    setInfo((current) => ({ ...current, classId: schoolClass.id, className: schoolClass.name, subjectId: subject?.id ?? "", subjectName: subject?.name ?? "", topicName: "" }));
  }

  function chooseSubject(subjectId: string) {
    const subject = availableSubjects.find((item) => item.id === subjectId);
    if (!subject) return;
    setSelected([]);
    setQuestionCache({});
    setTopicId("");
    setBankPage(1);
    setInfo((current) => ({ ...current, subjectId: subject.id, subjectName: subject.name, topicName: "" }));
  }

  function chooseTopic(value: string) {
    const topic = topics.find((item) => item.id === value);
    setTopicId(value);
    setBankTopicId(value);
    setBankPage(1);
    setInfo((current) => ({ ...current, topicName: topic?.name ?? "" }));
  }

  function toggleBankSelection(questionId: string) {
    if (selected.some((item) => item.questionId === questionId)) return;
    setBankSelection((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  }

  function addBankQuestions() {
    const additions = bankQuestions.filter((question) => bankSelection.has(question.id) && !selected.some((item) => item.questionId === question.id));
    setSelected((current) => [...current, ...additions.map((question, index) => ({ questionId: question.id, points: question.defaultPoints, order: current.length + index }))]);
    setBankSelection(new Set());
  }

  function updatePoints(questionId: string, points: number) {
    setSelected((items) => items.map((item) => item.questionId === questionId ? { ...item, points: Math.max(0, points) } : item));
  }

  function removeQuestion(questionId: string) {
    setSelected((items) => items.filter((item) => item.questionId !== questionId).map((item, order) => ({ ...item, order })));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    setSelected((items) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, order) => ({ ...item, order }));
    });
  }

  function changeManualType(type: QuestionType) {
    setManualForm((current) => ({
      ...current,
      type,
      options: type === "ESSAY" ? [] : type === "TRUE_FALSE" ? [{ id: "true", label: "Đ", text: "Đúng" }, { id: "false", label: "S", text: "Sai" }] : defaultQuestionOptions,
      correctOptionIds: [],
    }));
  }

  function toggleManualCorrect(optionId: string) {
    setManualForm((current) => {
      const selectedOption = current.correctOptionIds.includes(optionId);
      if (current.type === "MULTIPLE_CHOICE") return { ...current, correctOptionIds: selectedOption ? current.correctOptionIds.filter((id) => id !== optionId) : [...current.correctOptionIds, optionId] };
      return { ...current, correctOptionIds: selectedOption ? [] : [optionId] };
    });
  }

  function resetManualForm() {
    const topic = topics.find((item) => item.id === topicId) ?? topics[0];
    setManualForm({ ...emptyManualQuestion(), subjectId: info.subjectId, subjectName: info.subjectName, topicId: topic?.id ?? "", topicName: topic?.name ?? "" });
    setEditingManualId("");
  }

  function editManualQuestion(question: Question) {
    setQuestionMode("manual");
    setEditingManualId(question.id);
    setManualForm({ subjectId: question.subjectId, subjectName: question.subjectName, topicId: question.topicId, topicName: question.topicName, content: question.content, type: question.type, difficulty: question.difficulty, options: question.options, correctOptionIds: question.correctOptionIds, defaultPoints: selected.find((item) => item.questionId === question.id)?.points ?? question.defaultPoints, explanation: question.explanation });
  }

  async function saveManualQuestion() {
    setError("");
    if (!manualForm.topicId) { setError("Vui lòng chọn chủ đề trước khi tạo câu hỏi thủ công"); return; }
    if (!manualForm.content.trim()) { setError("Vui lòng nhập nội dung câu hỏi"); return; }
    if (manualForm.type !== "ESSAY" && manualForm.correctOptionIds.length === 0) { setError("Vui lòng chọn đáp án đúng"); return; }
    if (manualForm.type !== "ESSAY" && manualForm.options.some((option) => !option.text.trim())) { setError("Vui lòng nhập đầy đủ nội dung đáp án"); return; }
    setManualSaving(true);
    try {
      const payload = { ...manualForm, content: manualForm.content.trim(), options: manualForm.type === "ESSAY" ? [] : manualForm.options, correctOptionIds: manualForm.type === "ESSAY" ? [] : manualForm.correctOptionIds };
      const question = editingManualId ? await questionBankService.updateQuestion(editingManualId, payload) : await questionBankService.createQuestion(payload);
      setQuestionCache((current) => ({ ...current, [question.id]: question }));
      setManualQuestionIds((current) => new Set(current).add(question.id));
      setSelected((current) => current.some((item) => item.questionId === question.id) ? current.map((item) => item.questionId === question.id ? { ...item, points: payload.defaultPoints } : item) : [...current, { questionId: question.id, points: payload.defaultPoints, order: current.length }]);
      resetManualForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu câu hỏi thủ công");
    } finally { setManualSaving(false); }
  }

  function validateStep(targetStep = step): boolean {
    setError("");
    if (targetStep === 1) {
      if (!info.title.trim()) setError("Vui lòng nhập tên bài kiểm tra");
      else if (!info.classId) setError("Giáo viên chưa có lớp được phân công");
      else if (!info.subjectId) setError("Vui lòng chọn môn được phân công trong lớp");
      else return true;
      return false;
    }
    if (targetStep === 2) {
      const start = new Date(settings.startsAt).getTime();
      const end = new Date(settings.endsAt).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) { setError("Thời gian bắt đầu phải trước thời gian kết thúc"); return false; }
      if (settings.durationMinutes <= 0 || settings.attemptsAllowed <= 0) { setError("Thời lượng và số lần làm bài phải lớn hơn 0"); return false; }
    }
    if (targetStep === 3 && selected.length === 0) { setError("Hãy thêm ít nhất một câu hỏi"); return false; }
    return true;
  }

  async function save(publish: boolean) {
    if (![1, 2, 3].every((value) => validateStep(value))) return;
    setSaving(true); setError("");
    const payload: ExamInput = { ...info, title: info.title.trim(), description: info.description.trim(), questions: selected.map((item, order) => ({ ...item, order })), settings: { ...settings, startsAt: new Date(settings.startsAt).toISOString(), endsAt: new Date(settings.endsAt).toISOString() } };
    try {
      const saved = examId ? await examService.updateExam(examId, payload) : await examService.createExam(payload);
      if (publish) await examService.publishExam(saved.id);
      router.push("/teacher/exams");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu bài kiểm tra");
    } finally { setSaving(false); }
  }

  if (loading) return <AssessmentShell><LoadingPanel /></AssessmentShell>;
  return <AssessmentShell>
    <PageHeading eyebrow={examId ? "Edit exam" : "Create exam"} title={examId ? "Chỉnh sửa bài kiểm tra" : "Tạo bài kiểm tra"} description="Lớp và môn học được lấy trực tiếp từ phân công giảng dạy của bạn." action={<Button variant="ghost" onClick={() => router.push("/teacher/exams")}><ArrowLeft className="size-4" /> Thoát</Button>} />
    <div className="mb-5 grid grid-cols-4 gap-2">{["Thông tin", "Thời gian", "Câu hỏi", "Xem trước"].map((label, index) => <div key={label} className={`rounded-xl px-2 py-3 text-center text-xs font-black ${step === index + 1 ? "bg-brand-600 text-white" : step > index + 1 ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-400"}`}>{index + 1}. {label}</div>)}</div>
    {error ? <div className="mb-5"><ErrorPanel message={error} /></div> : null}
    {assignments.length === 0 ? <ErrorPanel message="Bạn chưa được Admin phân công môn học nào trong lớp học. Không thể tạo bài kiểm tra." /> : <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
      {step === 1 ? <div className="grid gap-5 md:grid-cols-2">
        <Input className="md:col-span-2" label="Tên bài kiểm tra" value={info.title} onChange={(event) => setInfo((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Kiểm tra chương 1" />
        <Select label="Lớp học được phân công" value={info.classId} onChange={(event) => chooseClass(event.target.value)}>{assignments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select label="Môn dạy trong lớp" value={info.subjectId} onChange={(event) => chooseSubject(event.target.value)}>{availableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select>
        <Select label="Chủ đề (không bắt buộc)" value={topicId} onChange={(event) => chooseTopic(event.target.value)}><option value="">Không chọn chủ đề</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</Select>
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">Mô tả<textarea value={info.description} onChange={(event) => setInfo((current) => ({ ...current, description: event.target.value }))} rows={4} className="rounded-xl border border-slate-200 p-3 font-normal outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-blue-100" /></label>
      </div> : null}
      {step === 2 ? <div className="grid gap-5 md:grid-cols-2">
        <Input type="datetime-local" label="Thời gian bắt đầu" value={settings.startsAt} onChange={(event) => setSettings((current) => ({ ...current, startsAt: event.target.value }))} />
        <Input type="datetime-local" label="Thời gian kết thúc" value={settings.endsAt} onChange={(event) => setSettings((current) => ({ ...current, endsAt: event.target.value }))} />
        <Input type="number" min="1" label="Thời lượng làm bài (phút)" value={settings.durationMinutes} onChange={(event) => setSettings((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} />
        <Input type="number" min="1" label="Số lần được phép" value={settings.attemptsAllowed} onChange={(event) => setSettings((current) => ({ ...current, attemptsAllowed: Number(event.target.value) }))} />
        <div className="space-y-3 md:col-span-2">{([ ["shuffleQuestions", "Trộn thứ tự câu hỏi"], ["shuffleAnswers", "Trộn đáp án"], ["showScoreImmediately", "Hiển thị điểm ngay sau khi nộp"], ["showCorrectAnswers", "Cho xem đáp án đúng"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} className="size-4 accent-brand-600" />{label}</label>)}</div>
      </div> : null}
      {step === 3 ? <div>
        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1.5">
          <Button variant={questionMode === "bank" ? "primary" : "ghost"} onClick={() => setQuestionMode("bank")}><Library className="size-4" /> Dùng ngân hàng câu hỏi</Button>
          <Button variant={questionMode === "manual" ? "primary" : "ghost"} onClick={() => setQuestionMode("manual")}><Plus className="size-4" /> Tạo câu hỏi thủ công</Button>
        </div>
        {questionMode === "bank" ? <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto]"><DebouncedSearchInput value={bankSearchInput} onValueChange={setBankSearchInput} onSearch={(value) => { setBankSearch(value); setBankPage(1); }} placeholder="Tìm nội dung câu hỏi..." /><Select value={bankTopicId} onChange={(event) => { setBankTopicId(event.target.value); setBankPage(1); }}><option value="">Mọi chủ đề</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</Select><Button disabled={bankSelection.size === 0} onClick={addBankQuestions}>Thêm {bankSelection.size || ""} câu</Button></div>
          <div className="mt-4 space-y-2">{bankLoading ? <LoadingPanel /> : bankQuestions.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Không có câu hỏi phù hợp.</p> : bankQuestions.map((question) => { const added = selected.some((item) => item.questionId === question.id); const checked = bankSelection.has(question.id); return <button key={question.id} type="button" disabled={added} onClick={() => toggleBankSelection(question.id)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left ${added ? "cursor-not-allowed border-emerald-200 bg-emerald-50 opacity-70" : checked ? "border-brand-300 bg-brand-50" : "border-slate-100 hover:border-brand-200"}`}><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${added || checked ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"}`}>{added || checked ? <Check className="size-4" /> : null}</span><span><span className="block font-bold text-slate-800">{question.content}</span><span className="mt-1 block text-xs text-slate-500">{QUESTION_TYPE_LABELS[question.type]} · {question.topicName} · {question.defaultPoints} điểm{added ? " · Đã thêm" : ""}</span></span></button>; })}</div>
          <div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="outline" disabled={bankPage === 1} onClick={() => setBankPage((page) => page - 1)}>Trang trước</Button><span className="grid min-w-20 place-items-center text-sm font-bold">Trang {bankPage}</span><Button size="sm" variant="outline" disabled={!bankHasNext} onClick={() => setBankPage((page) => page + 1)}>Trang sau</Button></div>
        </div> : <div className="mt-5 grid gap-5 rounded-2xl border border-slate-200 p-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">Nội dung câu hỏi<textarea rows={4} value={manualForm.content} onChange={(event) => setManualForm((current) => ({ ...current, content: event.target.value }))} className="rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-brand-400 focus:ring-4 focus:ring-blue-100" /></label>
          <Select label="Loại câu hỏi" value={manualForm.type} onChange={(event) => changeManualType(event.target.value as QuestionType)}>{Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Select label="Chủ đề" value={manualForm.topicId} onChange={(event) => { const topic = topics.find((item) => item.id === event.target.value); setManualForm((current) => ({ ...current, topicId: topic?.id ?? "", topicName: topic?.name ?? "" })); }}><option value="">Chọn chủ đề</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</Select>
          <Select label="Độ khó" value={manualForm.difficulty} onChange={(event) => setManualForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}>{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input label="Điểm câu hỏi" type="number" min="0" step="0.25" value={manualForm.defaultPoints} onChange={(event) => setManualForm((current) => ({ ...current, defaultPoints: Number(event.target.value) }))} />
          {manualForm.type !== "ESSAY" ? <div className="space-y-2 md:col-span-2"><p className="text-sm font-bold text-slate-700">Đáp án — nhấn ký hiệu để chọn đáp án đúng</p>{manualForm.options.map((option, index) => <div key={option.id} className="flex items-center gap-2"><button type="button" onClick={() => toggleManualCorrect(option.id)} className={`grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-black ${manualForm.correctOptionIds.includes(option.id) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-500"}`}>{option.label}</button><Input value={option.text} onChange={(event) => setManualForm((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) }))} placeholder={`Đáp án ${option.label}`} /></div>)}</div> : null}
          <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">Giải thích đáp án<textarea rows={3} value={manualForm.explanation} onChange={(event) => setManualForm((current) => ({ ...current, explanation: event.target.value }))} className="rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-brand-400" /></label>
          <div className="flex justify-end gap-2 md:col-span-2">{editingManualId ? <Button variant="outline" onClick={resetManualForm}>Hủy sửa</Button> : null}<Button disabled={manualSaving || topics.length === 0} onClick={() => void saveManualQuestion()}>{manualSaving ? "Đang lưu..." : editingManualId ? "Lưu thay đổi" : "Lưu và thêm vào bài"}</Button></div>
        </div>}
        <div className="mt-6"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-black">Danh sách câu hỏi đã thêm</h2><p className="mt-1 text-sm text-slate-500">{selected.length} câu · Tổng {selected.reduce((sum, item) => sum + item.points, 0)} điểm</p></div></div><div className="overflow-x-auto rounded-xl border border-slate-200"><Table className="min-w-[900px]"><TableHeader><tr><TableHead>STT</TableHead><TableHead>Câu hỏi</TableHead><TableHead>Loại</TableHead><TableHead>Chủ đề</TableHead><TableHead>Điểm</TableHead><TableHead>Nguồn</TableHead><TableHead className="text-right">Thao tác</TableHead></tr></TableHeader><TableBody>{selectedQuestions.length === 0 ? <TableEmptyRow colSpan={7} message="Chưa có câu hỏi trong bài kiểm tra." /> : selectedQuestions.map(({ question, points }, index) => <tr key={question!.id}><TableCell className="font-bold">{index + 1}</TableCell><TableCell><p className="max-w-80 font-semibold">{question!.content}</p></TableCell><TableCell>{QUESTION_TYPE_LABELS[question!.type]}</TableCell><TableCell>{question!.topicName}</TableCell><TableCell><Input className="w-24" type="number" min="0" step="0.25" value={points} onChange={(event) => updatePoints(question!.id, Number(event.target.value))} /></TableCell><TableCell>{manualQuestionIds.has(question!.id) ? "Thủ công" : "Ngân hàng"}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" disabled={index === 0} onClick={() => moveQuestion(index, -1)} aria-label="Đưa lên"><ArrowUp className="size-4" /></Button><Button size="sm" variant="ghost" disabled={index === selectedQuestions.length - 1} onClick={() => moveQuestion(index, 1)} aria-label="Đưa xuống"><ArrowDown className="size-4" /></Button>{manualQuestionIds.has(question!.id) ? <Button size="sm" variant="ghost" onClick={() => editManualQuestion(question!)} aria-label="Sửa câu hỏi"><Pencil className="size-4" /></Button> : null}<Button size="sm" variant="ghost" onClick={() => removeQuestion(question!.id)} aria-label="Xóa khỏi bài"><Trash2 className="size-4 text-rose-600" /></Button></div></TableCell></tr>)}</TableBody></Table></div></div>
      </div> : null}
      {step === 4 ? <div><div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Xem trước</p><h2 className="mt-2 text-2xl font-black">{info.title}</h2><p className="mt-1 text-sm text-slate-300">{info.className} · {info.subjectName} · {selected.length} câu · {selected.reduce((sum, item) => sum + item.points, 0)} điểm</p><p className="mt-2 text-sm text-slate-300">{formatDate(settings.startsAt)} – {formatDate(settings.endsAt)} · {settings.durationMinutes} phút</p></div><div className="mt-5 space-y-3">{selectedQuestions.map(({ question, points }, index) => <div key={question!.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-black text-brand-700">{index + 1}</span><div><p className="font-bold text-slate-800">{question!.content}</p><p className="mt-1 text-xs text-slate-500">{points} điểm</p></div></div>)}</div></div> : null}
      <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5"><Button variant="outline" disabled={step === 1 || saving} onClick={() => { setError(""); setStep((value) => value - 1); }}>Quay lại</Button>{step < 4 ? <Button onClick={() => { if (validateStep()) setStep((value) => value + 1); }}>Tiếp theo <ChevronRight className="size-4" /></Button> : <div className="flex gap-2"><Button variant="outline" disabled={saving} onClick={() => void save(false)}>{saving ? "Đang lưu..." : "Lưu nháp"}</Button><Button disabled={saving} onClick={() => void save(true)}><Send className="size-4" /> {saving ? "Đang giao..." : "Lưu và giao bài"}</Button></div>}</div>
    </section>}
  </AssessmentShell>;
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
  useEffect(() => { void examService.getExamById(params.id).then(async (loadedExam) => { setExam(loadedExam); setQuestions(await questionBankService.getQuestions({ subjectId: loadedExam.subjectId })); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải đề")); }, [params.id]);
  if (error) return <AssessmentShell><ErrorPanel message={error} /></AssessmentShell>;
  if (!exam) return <AssessmentShell><LoadingPanel /></AssessmentShell>;
  return <AssessmentShell><PageHeading eyebrow="Exam detail" title={exam.title} description={`${exam.subjectName} · ${exam.className}`} action={<Button variant="ghost" onClick={() => router.push("/teacher/exams")}><ArrowLeft className="size-4" /> Quay lại</Button>} /><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><h2 className="font-black">Danh sách câu hỏi</h2><div className="mt-4 space-y-2">{[...exam.questions].sort((a, b) => a.order - b.order).map((item, index) => { const question = questions.find((value) => value.id === item.questionId); return <div key={item.questionId} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4"><GripVertical className="mt-1 size-4 text-slate-300" /><span className="font-black text-brand-700">{index + 1}</span><div><p className="font-bold">{question?.content ?? `Câu hỏi ${item.questionId}`}</p><p className="mt-1 text-xs text-slate-500">{item.points} điểm</p></div></div>; })}</div></section><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusClass(exam.status)}`}>{EXAM_STATUS_LABELS[exam.status]}</span><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-slate-400">Lịch làm bài</dt><dd className="mt-1 font-bold">{formatDate(exam.settings.startsAt)} – {formatDate(exam.settings.endsAt)}</dd></div><div><dt className="text-xs text-slate-400">Cấu hình</dt><dd className="mt-1 font-bold">{exam.settings.durationMinutes} phút · {exam.settings.attemptsAllowed} lần</dd></div><div><dt className="text-xs text-slate-400">Học sinh đã làm</dt><dd className="mt-1 font-bold">{exam.attemptedCount ?? 0}</dd></div></dl>{(exam.attemptedCount ?? 0) === 0 ? <Button className="mt-6 w-full" variant="outline" onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)}><FilePenLine className="size-4" /> Chỉnh sửa</Button> : null}<Button className="mt-2 w-full" variant="secondary" onClick={() => router.push(`/teacher/exams/${exam.id}/submissions`)}>Xem kết quả</Button></aside></div></AssessmentShell>;
}
