"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, Edit3, LoaderCircle, Plus, Search, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DataTableFooter } from "@/components/ui/data-table-footer";
import { Table, TableBody, TableCell, TableEmptyRow, TableHead, TableHeader, TableLoadingBarRow } from "@/components/ui/data-table";
import { CustomSelect } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import type { SchoolClass, Subject, SubjectTeacherAssignment } from "@/types/assessment";
import type { UsersPage } from "@/types/users";

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  return error.details.length ? error.details.join(" · ") : error.message;
}

export function SubjectTeacherAssignmentPanel() {
  const { notify } = useActionNotification();
  const [assignments, setAssignments] = useState<SubjectTeacherAssignment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<UsersPage["items"]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectTeacherAssignment | null>(null);
  const [deleting, setDeleting] = useState<SubjectTeacherAssignment | null>(null);
  const [form, setForm] = useState({ teacherId: "", subjectId: "", classId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const [loadedAssignments, loadedClasses, loadedSubjects, teacherPage] = await Promise.all([
        academicDataService.getSubjectTeacherAssignments(),
        academicDataService.getClasses(undefined, false),
        academicDataService.getSubjects(false),
        authenticatedRequest<UsersPage>("/users?role=TEACHER&status=ACTIVE&limit=100"),
      ]);
      setAssignments(loadedAssignments);
      setClasses(loadedClasses);
      setSubjects(loadedSubjects);
      setTeachers(teacherPage.items);
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải danh sách phân công bộ môn"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredAssignments = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return assignments.filter((item) => {
      const matchesSearch = !normalized
        || item.teacher.fullName.toLowerCase().includes(normalized)
        || item.teacher.accountName.toLowerCase().includes(normalized)
        || item.subject.name.toLowerCase().includes(normalized)
        || item.subject.code.toLowerCase().includes(normalized)
        || item.schoolClass.name.toLowerCase().includes(normalized)
        || item.schoolClass.code.toLowerCase().includes(normalized);
      return matchesSearch
        && (!classFilter || item.classId === classFilter)
        && (!subjectFilter || item.subjectId === subjectFilter)
        && (!teacherFilter || item.teacherId === teacherFilter);
    });
  }, [assignments, classFilter, search, subjectFilter, teacherFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const pagedAssignments = filteredAssignments.slice((page - 1) * pageSize, page * pageSize);
  const classOptions = classes.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  const subjectOptions = subjects.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  const teacherOptions = teachers.map((item) => ({ value: item.id, label: `${item.fullName} · ${item.accountName}` }));

  function openCreate() {
    setEditing(null);
    setForm({ teacherId: teachers[0]?.id ?? "", subjectId: subjects[0]?.id ?? "", classId: classes[0]?.id ?? "" });
    setIsModalOpen(true);
  }

  function openEdit(item: SubjectTeacherAssignment) {
    setEditing(item);
    setForm({ teacherId: item.teacherId, subjectId: item.subjectId, classId: item.classId });
    setIsModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await academicDataService.updateSubjectTeacherAssignment(editing.id, form);
      else await academicDataService.createSubjectTeacherAssignment(form);
      setIsModalOpen(false);
      await load();
      notify(editing ? "Đã cập nhật phân công bộ môn" : "Đã tạo phân công bộ môn", { key: "subject-teacher-assignment-saved" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể lưu phân công bộ môn"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    try {
      await academicDataService.deleteSubjectTeacherAssignment(deleting.id);
      setDeleting(null);
      await load();
      notify("Đã xóa phân công bộ môn", { key: "subject-teacher-assignment-deleted" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể xóa phân công bộ môn"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-card">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(230px,1fr)_190px_190px_220px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm giáo viên, môn học hoặc lớp" className="h-[42px] w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-blue-100" /></div>
            <CustomSelect value={classFilter} options={[{ value: "", label: "Tất cả lớp học" }, ...classOptions]} buttonClassName="!h-[42px] !rounded-lg !ring-0" onValueChange={(value) => { setClassFilter(value); setPage(1); }} ariaLabel="Lọc theo lớp học" />
            <CustomSelect value={subjectFilter} options={[{ value: "", label: "Tất cả môn học" }, ...subjectOptions]} buttonClassName="!h-[42px] !rounded-lg !ring-0" onValueChange={(value) => { setSubjectFilter(value); setPage(1); }} ariaLabel="Lọc theo môn học" />
            <CustomSelect value={teacherFilter} options={[{ value: "", label: "Tất cả giáo viên" }, ...teacherOptions]} buttonClassName="!h-[42px] !rounded-lg !ring-0" onValueChange={(value) => { setTeacherFilter(value); setPage(1); }} ariaLabel="Lọc theo giáo viên" />
          </div>
          <Button className="!h-[42px] !rounded-lg" onClick={openCreate}><Plus className="size-4" />Tạo phân công</Button>
        </div>
      </div>

      <section className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        {error ? <p className="m-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><XCircle className="size-4" />{error}</p> : null}
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="!bg-brand-600 !text-white"><tr><TableHead className="w-14 text-center">#</TableHead><TableHead>Giáo viên</TableHead><TableHead>Môn học</TableHead><TableHead>Lớp học</TableHead><TableHead>Trạng thái</TableHead><TableHead className="w-32 text-right">Thao tác</TableHead></tr></TableHeader>
            <TableBody>
              {isLoading ? <TableLoadingBarRow colSpan={6} /> : null}
              {!isLoading && pagedAssignments.length === 0 ? <TableEmptyRow colSpan={6} message="Không tìm thấy phân công bộ môn" icon={<BookOpen className="size-5 text-slate-400" />} /> : null}
              {!isLoading ? pagedAssignments.map((item, index) => (
                <tr key={item.id} className="transition hover:bg-slate-50/70">
                  <TableCell className="text-center text-xs text-slate-400">{(page - 1) * pageSize + index + 1}</TableCell>
                  <TableCell><p className="font-bold text-slate-900">{item.teacher.fullName}</p><p className="mt-0.5 text-xs text-slate-400">{item.teacher.accountName}</p></TableCell>
                  <TableCell><p className="font-bold text-slate-800">{item.subject.name}</p><p className="mt-0.5 text-xs font-semibold text-brand-600">{item.subject.code}</p></TableCell>
                  <TableCell><p className="font-bold text-slate-800">{item.schoolClass.name}</p><p className="mt-0.5 text-xs text-slate-400">{item.schoolClass.code}</p></TableCell>
                  <TableCell><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Đang hoạt động</span></TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" aria-label="Chỉnh sửa phân công" onClick={() => openEdit(item)}><Edit3 className="size-4" /></Button><Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" aria-label="Xóa phân công" onClick={() => setDeleting(item)}><Trash2 className="size-4" /></Button></div></TableCell>
                </tr>
              )) : null}
            </TableBody>
          </Table>
        </div>
        <DataTableFooter rowCount={pagedAssignments.length} totalItems={filteredAssignments.length} itemLabel="phân công" page={page} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </section>

      <Modal open={isModalOpen} title={editing ? "Chỉnh sửa phân công bộ môn" : "Tạo phân công bộ môn"} description="Chọn giáo viên, môn học và lớp học cần phân công." onClose={() => setIsModalOpen(false)} footer={<Button type="submit" form="subject-assignment-form" disabled={saving || !form.teacherId || !form.subjectId || !form.classId}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}{editing ? "Lưu thay đổi" : "Tạo phân công"}</Button>}>
        <form id="subject-assignment-form" onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
          <CustomSelect label="Giáo viên bộ môn" value={form.teacherId} options={teacherOptions} onValueChange={(teacherId) => setForm({ ...form, teacherId })} />
          <CustomSelect label="Môn học" value={form.subjectId} options={subjectOptions} onValueChange={(subjectId) => setForm({ ...form, subjectId })} />
          <CustomSelect label="Lớp học" value={form.classId} options={classOptions} onValueChange={(classId) => setForm({ ...form, classId })} />
        </form>
      </Modal>

      <ConfirmationDialog open={Boolean(deleting)} title="Xóa phân công bộ môn" onClose={() => setDeleting(null)} onConfirm={() => void handleDelete()} loading={saving} confirmVariant="danger" confirmLabel="Xóa phân công">
        <p>Phân công <b>{deleting?.teacher.fullName}</b> dạy môn <b>{deleting?.subject.name}</b> tại lớp <b>{deleting?.schoolClass.name}</b> sẽ được xóa mềm.</p>
      </ConfirmationDialog>
    </div>
  );
}
