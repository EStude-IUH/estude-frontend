"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Download,
  Edit3,
  FileText,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
import { getVietnameseSubjectName } from "@/lib/subject-localization";
import type { ClassTopic, ClassTopicInput, LearningMaterial, TeacherAssignedClass } from "@/types/assessment";

const emptyForm: ClassTopicInput = { subjectId: "", name: "", description: "", sortOrder: 0 };

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function TeacherClassLearningSpace({ classId }: { classId: string }) {
  const router = useRouter();
  const { notify } = useActionNotification();
  const [schoolClass, setSchoolClass] = useState<TeacherAssignedClass | null>(null);
  const [topics, setTopics] = useState<ClassTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTopicId, setUploadingTopicId] = useState("");
  const [deletingMaterialId, setDeletingMaterialId] = useState("");
  const [error, setError] = useState("");
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ClassTopic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<ClassTopic | null>(null);
  const [form, setForm] = useState<ClassTopicInput>(emptyForm);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [loadedClass, loadedTopics] = await Promise.all([
        academicDataService.getTeacherAssignedClass(classId),
        academicDataService.getClassTopics(classId),
      ]);
      setSchoolClass(loadedClass);
      setTopics(loadedTopics);
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
