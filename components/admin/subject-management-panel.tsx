"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  Edit3,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
import { CustomSelect, Input } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { useActionNotification } from "@/components/ui/action-notification";
import { academicDataService } from "@/lib/assessment-api";
import { ApiError } from "@/lib/auth-api";
import type { Subject } from "@/types/assessment";

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
];

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  return error.details.length ? error.details.join(" · ") : error.message;
}

export function SubjectManagementPanel() {
  const { notify } = useActionNotification();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subject) => {
        const normalized = search.trim().toLowerCase();
        const matchesSearch =
          !normalized ||
          subject.code.toLowerCase().includes(normalized) ||
          subject.name.toLowerCase().includes(normalized) ||
          subject.description.toLowerCase().includes(normalized);
        const matchesStatus =
          !statusFilter ||
          (statusFilter === "ACTIVE" ? subject.isActive : !subject.isActive);
        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter, subjects],
  );
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const pagedSubjects = filteredSubjects.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  async function loadSubjects() {
    setIsLoading(true);
    setError("");
    try {
      setSubjects(await academicDataService.getSubjects(true));
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải danh sách môn học"));
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void loadSubjects();
  }, []);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  function openCreate() {
    setEditingSubject(null);
    setForm({ code: "", name: "", description: "", isActive: true });
    setIsModalOpen(true);
  }
  function openEdit(subject: Subject) {
    setEditingSubject(subject);
    setForm({
      code: subject.code,
      name: subject.name,
      description: subject.description,
      isActive: subject.isActive,
    });
    setIsModalOpen(true);
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingSubject)
        await academicDataService.updateSubject(editingSubject.id, form);
      else await academicDataService.createSubject(form);
      setIsModalOpen(false);
      await loadSubjects();
      notify(editingSubject ? "Đã cập nhật môn học" : "Đã tạo môn học", {
        key: "subject-saved",
      });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể lưu môn học"));
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    if (!deleteSubject) return;
    setSaving(true);
    setError("");
    try {
      await academicDataService.deleteSubject(deleteSubject.id);
      setDeleteSubject(null);
      await loadSubjects();
      notify("Đã ngừng sử dụng môn học", { key: "subject-deleted" });
    } catch (cause) {
      setError(errorMessage(cause, "Không thể xóa môn học"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-card">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_200px]">
            <Input
              icon={Search}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo mã hoặc tên môn học"
            />
            <CustomSelect
              value={statusFilter}
              options={statusOptions}
              buttonClassName="!h-[42px] !rounded-lg !ring-0"
              ariaLabel="Lọc theo trạng thái"
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex shrink-0 justify-end">
            <Button className="!h-[42px] !rounded-lg" onClick={openCreate}>
              <Plus className="size-4" />
              Thêm môn học
            </Button>
          </div>
        </div>
      </div>
      <section className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        {error ? (
          <p className="m-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <XCircle className="size-4" />
            {error}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="!bg-brand-600 !text-white">
              <tr>
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>Mã môn học</TableHead>
                <TableHead>Tên môn học</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-32 text-right">Thao tác</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoadingBarRow colSpan={6} /> : null}
              {!isLoading && pagedSubjects.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  message="Không tìm thấy môn học"
                  icon={<BookOpen className="size-5 text-slate-400" />}
                />
              ) : null}
              {!isLoading
                ? pagedSubjects.map((subject, index) => (
                    <tr
                      key={subject.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <TableCell className="text-center text-xs text-slate-400">
                        {(page - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-brand-700">
                        {subject.code}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {subject.name}
                      </TableCell>
                      <TableCell className="max-w-sm truncate text-sm text-slate-500">
                        {subject.description || "--"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${subject.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {subject.isActive
                            ? "Đang hoạt động"
                            : "Ngừng hoạt động"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Sửa ${subject.name}`}
                            onClick={() => openEdit(subject)}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            aria-label={`Xóa ${subject.name}`}
                            onClick={() => setDeleteSubject(subject)}
                          >
                            <Trash2 className="size-4" />
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
          rowCount={pagedSubjects.length}
          totalItems={filteredSubjects.length}
          itemLabel="môn học"
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
        open={isModalOpen}
        title={editingSubject ? "Chỉnh sửa môn học" : "Thêm môn học"}
        description="Môn học được dùng chung qua nhiều năm học."
        onClose={() => setIsModalOpen(false)}
        footer={
          <Button type="submit" form="subject-form" disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {editingSubject ? "Lưu thay đổi" : "Thêm môn học"}
          </Button>
        }
      >
        <form
          id="subject-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Mã môn học"
              required
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
            />
            <Input
              label="Tên môn học"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <Input
            label="Mô tả"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
            />
            Đang hoạt động
          </label>
        </form>
      </Modal>
      <ConfirmationDialog
        open={Boolean(deleteSubject)}
        title="Xác nhận xóa mềm"
        onClose={() => setDeleteSubject(null)}
        onConfirm={() => void handleDelete()}
        loading={saving}
        confirmVariant="danger"
        confirmLabel="Xóa mềm"
      >
        <p>
          Môn học <b>{deleteSubject?.name}</b> sẽ được ngừng sử dụng và không bị
          xóa vật lý khỏi cơ sở dữ liệu.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
