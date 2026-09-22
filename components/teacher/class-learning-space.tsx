"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  ClipboardList,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  LoaderCircle,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useActionNotification } from "@/components/ui/action-notification";
import { ClassChatPanel } from "@/components/class-chat/class-chat-panel";
import { GradebookPanel } from "@/components/teacher/gradebook-panel";
import { academicDataService, examService } from "@/lib/assessment-api";
import { getVietnameseSubjectName } from "@/lib/subject-localization";
import type { ClassTopic, ClassTopicInput, Exam, ExamListAiAnalysis, LearningMaterial, TeacherAssignedClass } from "@/types/assessment";

const emptyForm: ClassTopicInput = { subjectId: "", name: "", description: "", sortOrder: 0 };

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function examStatus(exam: Exam): { label: string; className: string } {
  if (!exam.published) return { label: "Bản nháp", className: "bg-slate-100 text-slate-600" };
  if (exam.status === "ONGOING") return { label: "Đang diễn ra", className: "bg-emerald-50 text-emerald-700" };
  if (exam.status === "ENDED") return { label: "Đã kết thúc", className: "bg-blue-50 text-brand-700" };
  return { label: "Sắp diễn ra", className: "bg-amber-50 text-amber-700" };
}

export function TeacherClassLearningSpace({ classId }: { classId: string }) {
  const router = useRouter();
  const { notify } = useActionNotification();
  const [schoolClass, setSchoolClass] = useState<TeacherAssignedClass | null>(null);
  const [topics, setTopics] = useState<ClassTopic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTopicId, setUploadingTopicId] = useState("");
  const [deletingMaterialId, setDeletingMaterialId] = useState("");
  const [error, setError] = useState("");
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ClassTopic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<ClassTopic | null>(null);
  const [form, setForm] = useState<ClassTopicInput>(emptyForm);
  const [analyzingExams, setAnalyzingExams] = useState(false);
  const [examAnalysisOpen, setExamAnalysisOpen] = useState(false);
  const [examAnalysisError, setExamAnalysisError] = useState("");
  const [examAnalysis, setExamAnalysis] = useState<ExamListAiAnalysis | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [loadedClass, loadedTopics, loadedExams] = await Promise.all([
        academicDataService.getTeacherAssignedClass(classId),
        academicDataService.getClassTopics(classId),
        examService.getExams(),
      ]);
      setSchoolClass(loadedClass);
      setTopics(loadedTopics);
      setExams(loadedExams.filter((exam) => exam.classId === classId));
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải không gian lớp học"));
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateTopic() {
    setEditingTopic(null);
    setForm({ ...emptyForm, subjectId: schoolClass?.subjects[0]?.id ?? "", sortOrder: topics.length + 1 });
    setIsTopicModalOpen(true);
  }

  function openEditTopic(topic: ClassTopic) {
    setEditingTopic(topic);
    setForm({ subjectId: topic.subjectId, name: topic.name, description: topic.description, sortOrder: topic.sortOrder });
    setIsTopicModalOpen(true);
  }

  async function saveTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingTopic) {
        await academicDataService.updateClassTopic(editingTopic.id, {
          name: form.name,
          description: form.description,
          sortOrder: form.sortOrder,
        });
      } else {
        await academicDataService.createClassTopic(classId, form);
      }
      setIsTopicModalOpen(false);
      await load();
      notify(editingTopic ? "Đã cập nhật chủ đề" : "Đã tạo chủ đề", { key: "class-topic-saved" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể lưu chủ đề"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTopic() {
    if (!deletingTopic) return;
    setSaving(true);
    setError("");
    try {
      await academicDataService.deleteClassTopic(deletingTopic.id);
      setDeletingTopic(null);
      await load();
      notify("Đã xóa chủ đề và tài liệu liên quan", { key: "class-topic-deleted" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể xóa chủ đề"));
    } finally {
      setSaving(false);
    }
  }

  async function uploadMaterials(topic: ClassTopic, files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const oversized = selectedFiles.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) {
      setError(`Tệp ${oversized.name} vượt quá giới hạn 50MB`);
      return;
    }
    setUploadingTopicId(topic.id);
    setError("");
    try {
      for (const file of selectedFiles) {
        await academicDataService.uploadClassMaterial(topic.id, file);
      }
      await load();
      notify(`Đã tải lên ${selectedFiles.length} tài liệu`, { key: "class-material-uploaded" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải tài liệu lên S3"));
    } finally {
      setUploadingTopicId("");
    }
  }

  async function downloadMaterial(material: LearningMaterial) {
    setError("");
    try {
      const { url } = await academicDataService.getMaterialDownloadUrl(material.id);
      window.location.assign(url);
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải tài liệu"));
    }
  }

  async function deleteMaterial(topicId: string, material: LearningMaterial) {
    setDeletingMaterialId(material.id);
    setError("");
    try {
      await academicDataService.removeMaterialFromTopic(topicId, material.id);
      await load();
      notify("Đã gỡ tài liệu khỏi chủ đề", { key: "class-material-removed" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể gỡ tài liệu khỏi chủ đề"));
    } finally {
      setDeletingMaterialId("");
    }
  }

  async function analyzeClassExams() {
    if (!exams.length || exams.length > 30) return;
    setAnalyzingExams(true);
    setExamAnalysis(null);
    setExamAnalysisError("");
    setExamAnalysisOpen(true);
    try {
      const analysis = await examService.analyzeExamList({
        classId,
        examIds: exams.map((exam) => exam.id),
      });
      setExamAnalysis(analysis);
      notify(
        analysis.source === "AI"
          ? "AI đã hoàn tất phân tích các bài kiểm tra của lớp"
          : "Đã tạo phân tích dự phòng từ số liệu lớp",
        { key: "class-exam-ai-analysis" },
      );
    } catch (cause) {
      setExamAnalysisError(
        errorMessage(cause, "Không thể phân tích các bài kiểm tra của lớp"),
      );
    } finally {
      setAnalyzingExams(false);
    }
  }

  if (isLoading && !schoolClass) {
    return <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm font-semibold text-slate-500"><LoaderCircle className="size-5 animate-spin text-brand-600" />Đang tải lớp học...</div>;
  }

  return (
    <div className="space-y-3">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => router.push("/teacher/classes")}><ArrowLeft className="size-4" />Quay lại</Button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-slate-950">{schoolClass?.name ?? "Lớp học"}</h2>
            <p className="mt-1 text-sm text-slate-500">{schoolClass?.code} · {schoolClass?.studentCount ?? 0} học viên</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{schoolClass?.subjects.map((subject) => <span key={subject.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-brand-700">{subject.code} · {getVietnameseSubjectName(subject)}</span>)}</div>
          </div>
        </div>
        <Button permission="teaching.create" className="shrink-0" onClick={openCreateTopic} disabled={!schoolClass?.subjects.length}><Plus className="size-4" />Tạo chủ đề</Button>
      </section>

      <section data-testid="class-exam-list" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-black text-slate-900"><ClipboardList className="size-5 text-brand-600" />Bài kiểm tra của lớp</h3>
            <p className="mt-1 text-sm text-slate-500">Mở báo cáo để xem đủ học sinh, lượt làm và kết quả theo câu/chủ đề.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              permission="exams.submissions"
              variant="secondary"
              size="sm"
              className="min-w-[150px]"
              disabled={analyzingExams || exams.length === 0 || exams.length > 30}
              onClick={() => void analyzeClassExams()}
              title={
                exams.length > 30
                  ? "Danh sách tối đa 30 bài kiểm tra mỗi lần phân tích"
                  : "Phân tích toàn bộ bài kiểm tra của lớp bằng AI"
              }
            >
              {analyzingExams ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {analyzingExams ? "Đang phân tích..." : "AI phân tích lớp"}
            </Button>
            <Button permission="exams.read" variant="outline" size="sm" onClick={() => router.push("/teacher/exams")}>Quản lý bài kiểm tra</Button>
          </div>
        </header>
        {exams.length ? (
          <div className="divide-y divide-slate-100">
            {exams.map((exam) => {
              const status = examStatus(exam);
              return (
                <article key={exam.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-600"><FileCheck2 className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{exam.title}</p><span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${status.className}`}>{status.label}</span></div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span>{exam.subjectName}</span><span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />{new Date(exam.settings.startsAt).toLocaleString("vi-VN")}</span><span>{exam.attemptedCount ?? 0} học sinh đã bắt đầu</span></p>
                  </div>
                  <Button permission={exam.published ? "exams.submissions" : "exams.read"} size="sm" variant={exam.published ? "secondary" : "outline"} onClick={() => router.push(exam.published ? `/teacher/exams/${exam.id}/submissions` : `/teacher/exams/${exam.id}`)}>{exam.published ? "Xem báo cáo lớp" : "Xem bài kiểm tra"}</Button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-7 text-center text-sm text-slate-500">Lớp chưa có bài kiểm tra. Tạo và công bố bài kiểm tra để bắt đầu theo dõi kết quả.</div>
        )}
      </section>

      {schoolClass ? <GradebookPanel key={schoolClass.id} schoolClass={schoolClass} /> : null}
      <ClassChatPanel classId={classId} className={schoolClass?.name} />

      <Modal
        open={examAnalysisOpen}
        title="AI phân tích các bài kiểm tra của lớp"
        description={`${schoolClass?.name ?? "Lớp học"} · ${exams.length} bài kiểm tra`}
        onClose={() => setExamAnalysisOpen(false)}
        width="max-w-5xl"
        bodyClassName="max-h-[calc(100dvh-10rem)] overflow-y-auto !p-5"
      >
        {analyzingExams ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-semibold text-slate-500">
            <LoaderCircle className="size-6 animate-spin text-brand-600" />
            Đang tổng hợp xu hướng qua các bài kiểm tra...
          </div>
        ) : examAnalysisError ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{examAnalysisError}</div>
        ) : examAnalysis ? (
          <ClassExamAiAnalysis analysis={examAnalysis} />
        ) : null}
      </Modal>

      {error ? <p className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><XCircle className="size-4" />{error}</p> : null}

      {topics.length === 0 ? (
        <section className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div><BookOpenCheck className="mx-auto size-10 text-slate-300" /><h3 className="mt-4 font-black text-slate-800">Chưa có chủ đề học tập</h3><p className="mt-2 text-sm text-slate-500">Tạo chủ đề đầu tiên để tải tài liệu cho lớp.</p><Button permission="teaching.create" className="mt-5" onClick={openCreateTopic}><Plus className="size-4" />Tạo chủ đề</Button></div>
        </section>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <section key={topic.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
              <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-black text-brand-700">{topic.subject.code}</span><h3 className="truncate font-black text-slate-900">{topic.name}</h3></div>{topic.description ? <p className="mt-2 text-sm text-slate-500">{topic.description}</p> : null}</div>
                <div className="flex shrink-0 items-center gap-1">
                  <label className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700 ${uploadingTopicId ? "pointer-events-none opacity-60" : ""}`}>
                    {uploadingTopicId === topic.id ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}Tải tài liệu
                    <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp" onChange={(event) => { void uploadMaterials(topic, event.target.files); event.currentTarget.value = ""; }} />
                  </label>
                  <Button permission="teaching.update" variant="ghost" size="sm" aria-label={`Sửa ${topic.name}`} onClick={() => openEditTopic(topic)}><Edit3 className="size-4" /></Button>
                  <Button permission="teaching.delete" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" aria-label={`Xóa ${topic.name}`} onClick={() => setDeletingTopic(topic)}><Trash2 className="size-4" /></Button>
                </div>
              </header>
              <div className="divide-y divide-slate-100">
                {topic.materials.length === 0 ? <div className="flex items-center gap-3 px-5 py-4 text-sm text-slate-400"><FileText className="size-5" />Chưa có tài liệu trong chủ đề này.</div> : topic.materials.map((material) => (
                  <article key={material.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-600"><FileText className="size-5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{material.originalName}</p><p className="mt-1 text-xs text-slate-400">{formatFileSize(material.size)} · {new Date(material.createdAt).toLocaleString("vi-VN")}</p></div>
                    <Button permission="materials.download" variant="ghost" size="sm" aria-label={`Tải ${material.originalName}`} onClick={() => void downloadMaterial(material)}><Download className="size-4" /></Button>
                    <Button permission="materials.assign" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" aria-label={`Gỡ ${material.originalName} khỏi chủ đề`} disabled={deletingMaterialId === material.id} onClick={() => void deleteMaterial(topic.id, material)}>{deletingMaterialId === material.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={isTopicModalOpen} title={editingTopic ? "Chỉnh sửa chủ đề" : "Tạo chủ đề"} description="Chủ đề được quản lý riêng theo lớp và môn học được phân công." onClose={() => setIsTopicModalOpen(false)} footer={<Button permission={editingTopic ? "teaching.update" : "teaching.create"} type="submit" form="class-topic-form" disabled={saving || !form.subjectId || !form.name.trim()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}{editingTopic ? "Lưu thay đổi" : "Tạo chủ đề"}</Button>}>
        <form id="class-topic-form" onSubmit={(event) => void saveTopic(event)} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">Môn học<select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} disabled={Boolean(editingTopic)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-brand-500 disabled:bg-slate-50">{schoolClass?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {getVietnameseSubjectName(subject)}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Tên chủ đề<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ví dụ: React Hooks" className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Mô tả<textarea rows={4} maxLength={1000} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Mô tả nội dung và mục tiêu của chủ đề" className="rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Thứ tự hiển thị<input type="number" min={0} value={form.sortOrder ?? 0} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-brand-500" /></label>
        </form>
      </Modal>

      <ConfirmationDialog open={Boolean(deletingTopic)} title="Xóa chủ đề" confirmLabel="Xóa chủ đề" confirmVariant="danger" loading={saving} onClose={() => setDeletingTopic(null)} onConfirm={() => void deleteTopic()}><p>Chủ đề <b>{deletingTopic?.name}</b> sẽ bị xóa. Các tệp gốc vẫn được giữ trong thư viện tài liệu.</p></ConfirmationDialog>
    </div>
  );
}

function ClassExamAiAnalysis({ analysis }: { analysis: ExamListAiAnalysis }) {
  const trend = {
    IMPROVING: { label: "Đang cải thiện", icon: TrendingUp, className: "bg-emerald-50 text-emerald-700" },
    DECLINING: { label: "Có xu hướng giảm", icon: TrendingDown, className: "bg-rose-50 text-rose-700" },
    STABLE: { label: "Tương đối ổn định", icon: Minus, className: "bg-blue-50 text-brand-700" },
    INSUFFICIENT_DATA: { label: "Chưa đủ dữ liệu", icon: Minus, className: "bg-slate-100 text-slate-600" },
  }[analysis.trend.direction];
  const TrendIcon = trend.icon;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white"><BrainCircuit className="size-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">{analysis.headline}</h3>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${analysis.source === "AI" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>{analysis.source === "AI" ? "Gemini AI" : "Phân tích dự phòng"}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.summary}</p>
          </div>
        </div>
        <div className={`mt-4 flex items-start gap-3 rounded-xl p-4 ${trend.className}`}><TrendIcon className="mt-0.5 size-5 shrink-0" /><div><p className="font-black">{trend.label}</p><p className="mt-1 text-sm leading-6">{analysis.trend.evidence}</p></div></div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClassExamInsight title="Điểm tích cực" items={analysis.strengths} className="border-emerald-100 bg-emerald-50/50" />
        <ClassExamInsight title="Điểm cần chú ý" items={analysis.concerns} className="border-amber-100 bg-amber-50/50" />
      </div>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h3 className="font-black text-slate-950">Đề xuất ưu tiên</h3>
        <div className="mt-3 space-y-3">{analysis.recommendations.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.action}</p></div>)}</div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="font-black text-slate-950">Gợi ý hoạt động tiếp theo</h3><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-700">{analysis.lessonPlan.durationMinutes} phút</span></div>
        <p className="mt-2 font-bold text-brand-800">{analysis.lessonPlan.focus}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{analysis.lessonPlan.objective}</p>
        <ol className="mt-3 space-y-2">{analysis.lessonPlan.activities.map((activity, index) => <li key={`${activity}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white font-black text-brand-700">{index + 1}</span>{activity}</li>)}</ol>
      </section>
      <p className="text-xs leading-5 text-slate-400">AI chỉ nhận số liệu tổng hợp đã ẩn danh của lớp. Giáo viên cần đối chiếu với bối cảnh thực tế trước khi áp dụng.</p>
    </div>
  );
}

function ClassExamInsight({ title, items, className }: { title: string; items: Array<{ title: string; evidence: string }>; className: string }) {
  return <section className={`rounded-2xl border p-5 ${className}`}><h3 className="font-black text-slate-950">{title}</h3><div className="mt-3 space-y-3">{items.length ? items.map((item, index) => <div key={`${item.title}-${index}`}><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.evidence}</p></div>) : <p className="text-sm text-slate-500">Chưa có tín hiệu đủ rõ.</p>}</div></section>;
}
