"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, Search, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect, Input } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableLoadingBarRow,
} from "@/components/ui/data-table";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
import { matchesSearchKeyword } from "@/lib/search-keyword";
import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import type { ClassRoster } from "@/types/assessment";
import type { UsersPage } from "@/types/users";

function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  return error.details.length > 0 ? error.details.join(" · ") : error.message;
}

export function ClassAssignmentContent({ classId }: { classId: string }) {
  const { notify } = useActionNotification();
  const [teachers, setTeachers] = useState<UsersPage["items"]>([]);
  const [availableStudents, setAvailableStudents] = useState<ClassRoster["students"]>([]);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [isAvailableLoading, setIsAvailableLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const loadAvailableStudents = useCallback(async () => {
    setIsAvailableLoading(true);
    try {
      setAvailableStudents(await academicDataService.getAvailableStudents(classId));
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể tải danh sách học sinh chưa có lớp"));
    } finally {
      setIsAvailableLoading(false);
    }
  }, [classId]);

  const loadCandidates = useCallback(async () => {
    try {
      const [teacherPage, students] = await Promise.all([
        authenticatedRequest<UsersPage>("/users?role=TEACHER&status=ACTIVE&limit=100"),
        academicDataService.getAvailableStudents(classId),
      ]);
      setTeachers(teacherPage.items);
      setAvailableStudents(students);
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể tải danh sách giáo viên và học sinh"));
    }
  }, [classId]);

  const loadRoster = useCallback(async () => {
    if (!classId) return;
    setIsRosterLoading(true);
    setError("");
    try {
      setRoster(await academicDataService.getClassRoster(classId));
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể tải danh sách phân công"));
    } finally {
      setIsRosterLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    setIsLoading(true);
    void Promise.all([loadCandidates(), loadRoster()]).finally(() => setIsLoading(false));
  }, [loadCandidates, loadRoster]);

  const assignedTeacher = roster?.teachers[0] ?? null;
  const teacherOptions = [
    { value: "", label: "Chưa phân công" },
    ...teachers.map((item) => ({ value: item.id, label: `${item.fullName} · ${item.accountName}` })),
  ];

  const filteredAvailableStudents = useMemo(() => {
    return availableStudents.filter((student) =>
      matchesSearchKeyword(student.keyword, studentSearch),
    );
  }, [availableStudents, studentSearch]);

  const allFilteredSelected = filteredAvailableStudents.length > 0
    && filteredAvailableStudents.every((student) => selectedStudentIds.includes(student.id));

  async function changeResponsibleTeacher(teacherId: string) {
    if (teacherId === (assignedTeacher?.id ?? "")) return;
    setSaving("teacher");
    setError("");
    try {
      if (teacherId) {
        await academicDataService.assignClassTeacher(classId, teacherId);
        notify("Đã cập nhật giáo viên phụ trách", { key: "class-teacher-assigned" });
      } else if (assignedTeacher) {
        await academicDataService.removeClassTeacher(classId, assignedTeacher.id);
        notify("Đã gỡ giáo viên phụ trách", { key: "class-teacher-removed" });
      }
      await loadRoster();
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể cập nhật giáo viên phụ trách"));
    } finally {
      setSaving("");
    }
  }

  function openStudentPicker() {
    setSelectedStudentIds([]);
    setStudentSearch("");
    setIsStudentPickerOpen(true);
    void loadAvailableStudents();
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function toggleAllFilteredStudents() {
    const filteredIds = filteredAvailableStudents.map((student) => student.id);
    setSelectedStudentIds((current) => {
      if (allFilteredSelected) return current.filter((id) => !filteredIds.includes(id));
      return [...new Set([...current, ...filteredIds])];
    });
  }

  async function assignSelectedStudents() {
    if (selectedStudentIds.length === 0) return;
    setSaving("students");
    setError("");
    try {
      for (const studentId of selectedStudentIds) {
        await academicDataService.assignClassStudent(classId, studentId);
      }
      const assignedCount = selectedStudentIds.length;
      setSelectedStudentIds([]);
      setIsStudentPickerOpen(false);
      await Promise.all([loadRoster(), loadAvailableStudents()]);
      notify(`Đã gán ${assignedCount} học sinh vào lớp`, { key: "class-students-assigned" });
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể gán học sinh vào lớp"));
      await Promise.all([loadRoster(), loadAvailableStudents()]);
    } finally {
      setSaving("");
    }
  }

  async function removeStudent(studentId: string) {
    setSaving(`student-${studentId}`);
    setError("");
    try {
      await academicDataService.removeClassStudent(classId, studentId);
      await Promise.all([loadRoster(), loadAvailableStudents()]);
      notify("Đã xóa học sinh khỏi lớp", { key: "class-student-removed" });
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể xóa học sinh khỏi lớp"));
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5">
      {error ? <p className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"><XCircle className="size-4" />{error}</p> : null}
      {isLoading || isRosterLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-slate-500"><LoaderCircle className="size-4 animate-spin" />Đang tải phân công...</div>
      ) : (
        <>
          <section className="border-b border-slate-100 pb-5">
            <CustomSelect label="Giáo viên phụ trách" value={assignedTeacher?.id ?? ""} options={teacherOptions} onValueChange={(value) => void changeResponsibleTeacher(value)} disabled={Boolean(saving)} ariaLabel="Chọn giáo viên phụ trách" />
            <p className="mt-1.5 text-xs leading-5 text-slate-400">Mỗi lớp học chỉ có một giáo viên phụ trách. Chọn giáo viên khác sẽ thay thế phân công hiện tại.</p>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <div className="min-w-0 flex-1"><h3 className="font-black">Danh sách học sinh</h3><p className="mt-1 text-xs text-slate-500">{roster?.students.length ?? 0} học sinh trong lớp</p></div>
              <Button size="sm" onClick={openStudentPicker} disabled={Boolean(saving)}><Plus className="size-4" />Gán học sinh</Button>
            </div>
            <div className="max-h-72 overflow-auto">
              <Table className="min-w-[620px]">
                <TableHeader className="sticky top-0 !bg-brand-600 !text-white"><tr><TableHead className="w-14 text-center">#</TableHead><TableHead>Họ và tên</TableHead><TableHead>Tài khoản</TableHead><TableHead>Trạng thái</TableHead><TableHead className="w-20 text-right">Thao tác</TableHead></tr></TableHeader>
                <TableBody>
                  {roster?.students.length ? roster.students.map((item, index) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                      <TableCell className="text-center text-xs text-slate-400">{index + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900">{item.fullName}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-brand-700">{item.accountName}</TableCell>
                      <TableCell><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Đang hoạt động</span></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" aria-label={`Xóa ${item.fullName} khỏi lớp`} onClick={() => void removeStudent(item.id)} disabled={Boolean(saving)}>{saving === `student-${item.id}` ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button></TableCell>
                    </tr>
                  )) : <TableEmptyRow colSpan={5} message="Lớp chưa có học sinh" />}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      <Modal
        open={isStudentPickerOpen}
        title="Gán học sinh vào lớp"
        description="Chỉ hiển thị học sinh chưa thuộc lớp nào trong năm học này."
        width="max-w-3xl"
        bodyClassName="!p-0"
        onClose={() => { if (saving !== "students") setIsStudentPickerOpen(false); }}
        footer={(
          <>
            <span className="mr-auto text-sm font-semibold text-slate-500">Đã chọn {selectedStudentIds.length} học sinh</span>
            <Button variant="outline" onClick={() => setIsStudentPickerOpen(false)} disabled={saving === "students"}>Hủy</Button>
            <Button onClick={() => void assignSelectedStudents()} disabled={selectedStudentIds.length === 0 || saving === "students"}>
              {saving === "students" ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Gán {selectedStudentIds.length > 0 ? selectedStudentIds.length : ""} học sinh
            </Button>
          </>
        )}
      >
        <div className="border-b border-slate-100 p-4">
          <div className="max-w-sm">
            <Input icon={Search} value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Tìm theo tên hoặc tài khoản" />
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="sticky top-0 z-10 !bg-brand-600 !text-white">
              <tr>
                <TableHead className="w-14 text-center"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFilteredStudents} disabled={filteredAvailableStudents.length === 0 || isAvailableLoading} className="size-4 accent-brand-600" aria-label="Chọn tất cả học sinh" /></TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Tài khoản</TableHead>
                <TableHead className="w-36">Trạng thái</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {isAvailableLoading ? <TableLoadingBarRow colSpan={4} /> : null}
              {!isAvailableLoading && filteredAvailableStudents.length === 0 ? <TableEmptyRow colSpan={4} message={studentSearch ? "Không tìm thấy học sinh phù hợp" : "Không còn học sinh chưa có lớp"} /> : null}
              {!isAvailableLoading ? filteredAvailableStudents.map((student) => (
                <tr key={student.id} className={`cursor-pointer transition hover:bg-slate-50/70 ${selectedStudentIds.includes(student.id) ? "bg-blue-50/70" : ""}`} onClick={() => toggleStudent(student.id)}>
                  <TableCell className="text-center"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} onClick={(event) => event.stopPropagation()} className="size-4 accent-brand-600" aria-label={`Chọn ${student.fullName}`} /></TableCell>
                  <TableCell className="font-bold text-slate-900">{student.fullName}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-brand-700">{student.accountName}</TableCell>
                  <TableCell><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Chưa có lớp</span></TableCell>
                </tr>
              )) : null}
            </TableBody>
          </Table>
        </div>
      </Modal>
    </div>
  );
}
