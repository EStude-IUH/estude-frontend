"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookCopy,
  CheckSquare2,
  Download,
  FileText,
  FolderInput,
  Library,
  LoaderCircle,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Modal } from "@/components/ui/modal";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
import type {
  ClassTopic,
  LearningMaterial,
  MaterialAssignmentTarget,
  TeacherAssignedClass,
} from "@/types/assessment";

type TargetDraft = {
  selected: boolean;
  subjectId: string;
  topicMode: "existing" | "new";
  topicId: string;
  topicName: string;
};

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function TeacherMaterialLibraryPanel() {
  const { notify } = useActionNotification();
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [classes, setClasses] = useState<TeacherAssignedClass[]>([]);
  const [topicsByClass, setTopicsByClass] = useState<Record<string, ClassTopic[]>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targets, setTargets] = useState<Record<string, TargetDraft>>({});
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<LearningMaterial | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [loadedMaterials, loadedClasses] = await Promise.all([
        academicDataService.getMaterialLibrary(),
        academicDataService.getTeacherAssignedClasses(),
      ]);
      const topicEntries = await Promise.all(
        loadedClasses.map(async (schoolClass) => [schoolClass.id, await academicDataService.getClassTopics(schoolClass.id)] as const),
      );
      setMaterials(loadedMaterials);
      setClasses(loadedClasses);
      setTopicsByClass(Object.fromEntries(topicEntries));
      setSelectedIds((current) => current.filter((id) => loadedMaterials.some((item) => item.id === id)));
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải thư viện tài liệu"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMaterials = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return materials;
    return materials.filter((material) =>
      [
        material.originalName,
        ...(material.assignments ?? []).flatMap((assignment) => [
          assignment.name,
          assignment.schoolClass.name,
          assignment.schoolClass.code,
          assignment.subject.name,
        ]),
      ].some((value) => value.toLocaleLowerCase("vi").includes(keyword)),
    );
  }, [materials, search]);

  const assignedMaterialCount = materials.filter((item) => (item.assignments?.length ?? 0) > 0).length;
  const allFilteredSelected = filteredMaterials.length > 0 && filteredMaterials.every((item) => selectedIds.includes(item.id));

  function toggleMaterial(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllFiltered() {
    const filteredIds = filteredMaterials.map((item) => item.id);
    setSelectedIds((current) => allFilteredSelected
      ? current.filter((id) => !filteredIds.includes(id))
      : [...new Set([...current, ...filteredIds])]);
  }

  async function uploadMaterials(files: FileList | null) {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const oversized = selectedFiles.find((file) => file.size > 50 * 1024 * 1024);
    if (oversized) {
      setError(`Tệp ${oversized.name} vượt quá giới hạn 50MB`);
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      for (const file of selectedFiles) await academicDataService.uploadLibraryMaterial(file);
      await load();
      notify(`Đã thêm ${selectedFiles.length} tài liệu vào thư viện`, { key: "library-material-uploaded" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải tài liệu lên S3"));
    } finally {
      setIsUploading(false);
    }
  }

  function openAssignModal() {
    const initialTargets: Record<string, TargetDraft> = {};
    for (const schoolClass of classes) {
      const subjectId = schoolClass.subjects[0]?.id ?? "";
      const availableTopics = (topicsByClass[schoolClass.id] ?? []).filter((topic) => topic.subjectId === subjectId);
      initialTargets[schoolClass.id] = {
        selected: false,
        subjectId,
        topicMode: availableTopics.length ? "existing" : "new",
        topicId: availableTopics[0]?.id ?? "",
        topicName: "",
      };
    }
    setTargets(initialTargets);
    setIsAssignModalOpen(true);
  }

  function updateTarget(classId: string, update: Partial<TargetDraft>) {
    setTargets((current) => ({ ...current, [classId]: { ...current[classId], ...update } }));
  }

  function changeSubject(schoolClass: TeacherAssignedClass, subjectId: string) {
    const availableTopics = (topicsByClass[schoolClass.id] ?? []).filter((topic) => topic.subjectId === subjectId);
    updateTarget(schoolClass.id, {
      subjectId,
      topicMode: availableTopics.length ? "existing" : "new",
      topicId: availableTopics[0]?.id ?? "",
      topicName: "",
    });
  }

  async function assignMaterials() {
    const payload: MaterialAssignmentTarget[] = classes.flatMap((schoolClass) => {
      const target = targets[schoolClass.id];
      if (!target?.selected) return [];
      return [{
        classId: schoolClass.id,
        subjectId: target.subjectId,
        ...(target.topicMode === "existing" ? { topicId: target.topicId } : { topicName: target.topicName.trim() }),
      }];
    });
    if (!payload.length) {
      setError("Vui lòng chọn ít nhất một lớp học");
      return;
    }
    if (payload.some((target) => !target.subjectId || (!target.topicId && !target.topicName))) {
      setError("Vui lòng chọn hoặc nhập chủ đề cho từng lớp");
      return;
    }
    setIsAssigning(true);
    setError("");
    try {
      const result = await academicDataService.bulkAssignMaterials(selectedIds, payload);
      setIsAssignModalOpen(false);
      setSelectedIds([]);
      await load();
      notify(`Đã tạo ${result.assignedCount} lượt gán tài liệu`, { key: "library-material-assigned" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể gán tài liệu vào lớp"));
    } finally {
      setIsAssigning(false);
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

  async function deleteMaterial() {
    if (!deletingMaterial) return;
    setIsAssigning(true);
    setError("");
    try {
      await academicDataService.deleteLearningMaterial(deletingMaterial.id);
      setDeletingMaterial(null);
      await load();
      notify("Đã xóa tài liệu khỏi thư viện và các lớp", { key: "library-material-deleted" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể xóa tài liệu"));
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">Teacher library</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Thư viện tài liệu</h2>
            <p className="mt-1 text-sm text-slate-500">Tải lên một lần, chọn nhiều tệp và phân phối đến nhiều lớp học.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!selectedIds.length || isLoading} onClick={openAssignModal}>
              <FolderInput className="size-4" /> Gán {selectedIds.length ? `${selectedIds.length} tài liệu` : "vào lớp"}
            </Button>
            <label className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700 ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
              {isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {isUploading ? "Đang tải lên..." : "Tải tài liệu"}
              <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp" onChange={(event) => { void uploadMaterials(event.target.files); event.currentTarget.value = ""; }} />
            </label>
          </div>
        </div>
      </section>

      {error ? <p className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><XCircle className="size-4" />{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Library className="size-5" />} label="Tổng tài liệu" value={materials.length} tone="bg-blue-50 text-brand-700" />
        <StatCard icon={<BookCopy className="size-5" />} label="Đã phân phối" value={assignedMaterialCount} tone="bg-emerald-50 text-emerald-700" />
        <StatCard icon={<CheckSquare2 className="size-5" />} label="Đang chọn" value={selectedIds.length} tone="bg-violet-50 text-violet-700" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="size-4 rounded border-slate-300 accent-brand-600" />
            Chọn tất cả ({filteredMaterials.length})
          </label>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, lớp hoặc chủ đề" className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-blue-50" />
          </div>
        </header>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><LoaderCircle className="size-5 animate-spin text-brand-600" />Đang tải thư viện...</div>
        ) : filteredMaterials.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center"><div><Library className="mx-auto size-10 text-slate-300" /><h3 className="mt-3 font-black text-slate-800">Chưa có tài liệu</h3><p className="mt-1 text-sm text-slate-500">Tải các tệp dùng chung lên để bắt đầu phân phối cho lớp.</p></div></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMaterials.map((material) => (
              <article key={material.id} className={`flex items-start gap-3 px-4 py-4 transition hover:bg-slate-50/70 ${selectedIds.includes(material.id) ? "bg-blue-50/50" : ""}`}>
                <input type="checkbox" checked={selectedIds.includes(material.id)} onChange={() => toggleMaterial(material.id)} aria-label={`Chọn ${material.originalName}`} className="mt-3 size-4 shrink-0 rounded border-slate-300 accent-brand-600" />
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-600"><FileText className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{material.originalName}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatFileSize(material.size)} · {new Date(material.createdAt).toLocaleString("vi-VN")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(material.assignments ?? []).length ? (material.assignments ?? []).map((assignment) => (
                      <span key={assignment.id} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{assignment.schoolClass.code} · {assignment.name}</span>
                    )) : <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">Chưa gán vào lớp</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" aria-label={`Tải ${material.originalName}`} onClick={() => void downloadMaterial(material)}><Download className="size-4" /></Button>
                <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" aria-label={`Xóa ${material.originalName}`} onClick={() => setDeletingMaterial(material)}><Trash2 className="size-4" /></Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal open={isAssignModalOpen} title={`Gán ${selectedIds.length} tài liệu vào lớp`} description="Chọn nhiều lớp; mỗi lớp có thể dùng chủ đề sẵn có hoặc tạo chủ đề mới." width="max-w-4xl" bodyClassName="max-h-[68vh] overflow-y-auto" onClose={() => !isAssigning && setIsAssignModalOpen(false)} footer={<><Button variant="outline" disabled={isAssigning} onClick={() => setIsAssignModalOpen(false)}>Hủy</Button><Button disabled={isAssigning || !Object.values(targets).some((target) => target.selected)} onClick={() => void assignMaterials()}>{isAssigning ? <LoaderCircle className="size-4 animate-spin" /> : <FolderInput className="size-4" />}Gán tài liệu</Button></>}>
        {error ? <p className="mb-3 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><XCircle className="size-4" />{error}</p> : null}
        {classes.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Bạn chưa được phân công lớp học nào.</p> : <div className="space-y-3">
          {classes.map((schoolClass) => {
            const target = targets[schoolClass.id];
            if (!target) return null;
            const availableTopics = (topicsByClass[schoolClass.id] ?? []).filter((topic) => topic.subjectId === target.subjectId);
            return <section key={schoolClass.id} className={`rounded-xl border p-4 transition ${target.selected ? "border-brand-200 bg-blue-50/40" : "border-slate-200"}`}>
              <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={target.selected} onChange={(event) => updateTarget(schoolClass.id, { selected: event.target.checked })} className="mt-1 size-4 rounded border-slate-300 accent-brand-600" /><span><b className="block text-sm text-slate-900">{schoolClass.name}</b><span className="mt-0.5 block text-xs font-semibold text-brand-600">{schoolClass.code}</span></span></label>
              {target.selected ? <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Môn học<select value={target.subjectId} onChange={(event) => changeSubject(schoolClass, event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-brand-400">{schoolClass.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</select></label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Cách gán<select value={target.topicMode} onChange={(event) => updateTarget(schoolClass.id, { topicMode: event.target.value as "existing" | "new" })} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-brand-400"><option value="existing" disabled={!availableTopics.length}>Chủ đề có sẵn</option><option value="new">Tạo chủ đề mới</option></select></label>
                {target.topicMode === "existing" ? <label className="grid gap-1.5 text-xs font-bold text-slate-600">Chủ đề<select value={target.topicId} onChange={(event) => updateTarget(schoolClass.id, { topicId: event.target.value })} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-brand-400">{availableTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label> : <label className="grid gap-1.5 text-xs font-bold text-slate-600">Tên chủ đề mới<input required maxLength={120} value={target.topicName} onChange={(event) => updateTarget(schoolClass.id, { topicName: event.target.value })} placeholder="Ví dụ: Tài liệu tuần 1" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-brand-400" /></label>}
              </div> : null}
            </section>;
          })}
        </div>}
      </Modal>

      <ConfirmationDialog open={Boolean(deletingMaterial)} title="Xóa tài liệu khỏi thư viện" confirmLabel="Xóa tài liệu" confirmVariant="danger" loading={isAssigning} onClose={() => setDeletingMaterial(null)} onConfirm={() => void deleteMaterial()}>
        <p>Tệp <b>{deletingMaterial?.originalName}</b> sẽ bị xóa khỏi S3 và tất cả chủ đề đang sử dụng tệp này. Thao tác này không thể hoàn tác.</p>
      </ConfirmationDialog>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}>{icon}</span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-xl font-black text-slate-900">{value}</p></div></section>;
}
