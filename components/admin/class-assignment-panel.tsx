"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/form-control";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
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
  const [students, setStudents] = useState<UsersPage["items"]>([]);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const loadCandidates = useCallback(async () => {
    try {
      const [teacherPage, studentPage] = await Promise.all([
        authenticatedRequest<UsersPage>("/users?role=TEACHER&status=ACTIVE&limit=100"),
        authenticatedRequest<UsersPage>("/users?role=STUDENT&status=ACTIVE&limit=100"),
      ]);
      setTeachers(teacherPage.items);
      setStudents(studentPage.items);
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể tải danh sách giáo viên và học sinh"));
    }
  }, []);

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
  const assignedStudentIds = useMemo(
    () => new Set(roster?.students.map((item) => item.id)),
    [roster],
  );
  const availableStudents = students.filter((item) => !assignedStudentIds.has(item.id));
  const teacherOptions = [
    { value: "", label: "Chưa phân công" },
    ...teachers.map((item) => ({ value: item.id, label: `${item.fullName} · ${item.accountName}` })),
  ];

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

  async function assignStudent() {
    if (!selectedStudentId) return;
    setSaving("student");
    setError("");
    try {
      await academicDataService.assignClassStudent(classId, selectedStudentId);
      setSelectedStudentId("");
      await loadRoster();
      notify("Đã gán học sinh vào lớp", { key: "class-student-assigned" });
    } catch (cause) {
      setError(getErrorMessage(cause, "Không thể gán học sinh vào lớp"));
    } finally {
      setSaving("");
    }
  }

  async function removeStudent(studentId: string) {
    setSaving(`student-${studentId}`);
    setError("");
    try {
      await academicDataService.removeClassStudent(classId, studentId);
      await loadRoster();
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
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
              <div className="flex-1"><h3 className="font-black">Danh sách học sinh</h3><p className="mt-1 text-xs text-slate-500">{roster?.students.length ?? 0} học sinh trong lớp</p></div>
              <div className="flex w-full gap-2 lg:max-w-xl">
                <div className="min-w-0 flex-1"><CustomSelect value={selectedStudentId} options={[{ value: "", label: "Chọn học sinh để gán" }, ...availableStudents.map((item) => ({ value: item.id, label: `${item.fullName} · ${item.accountName}` }))]} onValueChange={setSelectedStudentId} disabled={availableStudents.length === 0 || Boolean(saving)} ariaLabel="Chọn học sinh" /></div>
                <Button size="sm" onClick={() => void assignStudent()} disabled={!selectedStudentId || Boolean(saving)}>{saving === "student" ? <LoaderCircle className="size-4 animate-spin" /> : null}Gán học sinh</Button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="sticky top-0 bg-brand-600 text-xs uppercase tracking-wide text-white"><tr><th className="w-14 px-4 py-3 text-center">#</th><th className="px-4 py-3">Họ và tên</th><th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Trạng thái</th><th className="w-20 px-4 py-3 text-right">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {roster?.students.length ? roster.students.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-center text-xs text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{item.fullName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.accountName}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Đang hoạt động</span></td>
                      <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" aria-label={`Xóa ${item.fullName} khỏi lớp`} onClick={() => void removeStudent(item.id)} disabled={Boolean(saving)}>{saving === `student-${item.id}` ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Chưa có học sinh trong lớp.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
