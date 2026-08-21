"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { CheckCircle2, Edit3, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input, Select } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { academicDataService } from "@/lib/assessment-api";
import type {
  AcademicYear,
  GradeComponent,
  Subject,
  Term,
} from "@/types/assessment";

type YearStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";
type TermStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "LOCKED";
type DeleteTarget = { kind: "year" | "term"; id: string; label: string } | null;

const currentYear = new Date().getFullYear();
const dateInput = (value?: string) => (value ? value.slice(0, 10) : "");
const defaultYearForm = {
  name: "",
  startsAt: `${currentYear}-08-01`,
  endsAt: `${currentYear + 1}-07-31`,
  status: "UPCOMING" as YearStatus,
};
const defaultTermForm = {
  academicYearId: "",
  name: "",
  startsAt: `${currentYear}-08-01`,
  endsAt: `${currentYear}-12-31`,
  displayOrder: 1,
  status: "UPCOMING" as TermStatus,
};
const yearStatusLabels: Record<YearStatus, string> = {
  UPCOMING: "Sắp diễn ra",
  ACTIVE: "Đang hoạt động",
  COMPLETED: "Đã hoàn tất",
};
const termStatusLabels: Record<TermStatus, string> = {
  UPCOMING: "Sắp diễn ra",
  ACTIVE: "Đang diễn ra",
  COMPLETED: "Đã hoàn tất",
  LOCKED: "Đã khóa",
};

export function AcademicDataPanel() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [yearForm, setYearForm] = useState(defaultYearForm);
  const [termForm, setTermForm] = useState(defaultTermForm);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeSubjects = useMemo(
    () => subjects.filter((item) => item.isActive),
    [subjects],
  );

  const load = useCallback(async () => {
    try {
      const [loadedYears, loadedTerms, loadedSubjects] = await Promise.all([
        academicDataService.getAcademicYears(true),
        academicDataService.getTerms(undefined, true),
        academicDataService.getSubjects(),
      ]);
      setYears(loadedYears);
      setTerms(loadedTerms);
      setSubjects(loadedSubjects);
      setSelectedYearId((current) =>
        current && loadedYears.some((item) => item.id === current)
          ? current
          : (loadedYears.find((item) => item.status === "ACTIVE")?.id ??
            loadedYears[0]?.id ??
            ""),
      );
      setSelectedSubjectId((current) =>
        current && loadedSubjects.some((item) => item.id === current)
          ? current
          : (loadedSubjects[0]?.id ?? ""),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải dữ liệu học vụ",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  async function run(action: () => Promise<unknown>, fallback: string) {
    setSaving(true);
    setError("");
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setSaving(false);
    }
  }
  async function submitYear(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (editingYear)
        await academicDataService.updateAcademicYear(editingYear.id, yearForm);
      else await academicDataService.createAcademicYear(yearForm);
      setEditingYear(null);
      setYearModalOpen(false);
      setYearForm(defaultYearForm);
    }, "Không thể lưu năm học");
  }
  async function submitTerm(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (editingTerm)
        await academicDataService.updateTerm(editingTerm.id, termForm);
      else await academicDataService.createTerm(termForm);
      setEditingTerm(null);
      setTermModalOpen(false);
      setTermForm(defaultTermForm);
    }, "Không thể lưu học kỳ");
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await run(async () => {
      if (deleteTarget.kind === "year")
        await academicDataService.deleteAcademicYear(deleteTarget.id);
      else await academicDataService.deleteTerm(deleteTarget.id);
      setDeleteTarget(null);
    }, "Không thể xóa dữ liệu");
  }

  return (
    <div className="pb-8">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">
          Admin workspace
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Danh mục hệ thống
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Quản lý năm học, học kỳ và cấu hình thành phần điểm.
        </p>
      </div>
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <Header
            title="Năm học"
            description="Không tự động tạo theo ngày hệ thống."
            onAdd={() => {
              setEditingYear(null);
              setYearForm(defaultYearForm);
              setYearModalOpen(true);
            }}
          />
          <div className="mt-4 space-y-2">
            {years.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div>
                  <p className="font-bold">
                    {item.name}{" "}
                    <Badge
                      label={yearStatusLabels[item.status]}
                      status={item.status}
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dateInput(item.startsAt)} → {dateInput(item.endsAt)}
                  </p>
                </div>
                <Actions
                  onEdit={() => {
                    setEditingYear(item);
                    setYearForm({
                      name: item.name,
                      startsAt: dateInput(item.startsAt),
                      endsAt: dateInput(item.endsAt),
                      status: item.status,
                    });
                    setYearModalOpen(true);
                  }}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "year",
                      id: item.id,
                      label: item.name,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <Header
            title="Học kỳ"
            description="Tự sinh Học kỳ 1 và Học kỳ 2 khi tạo năm học."
            onAdd={() => {
              setEditingTerm(null);
              setTermForm({
                ...defaultTermForm,
                academicYearId: selectedYearId,
              });
              setTermModalOpen(true);
            }}
          />
          <div className="mt-4 space-y-2">
            {terms.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div>
                  <p className="font-bold">
                    {item.displayOrder}. {item.name}{" "}
                    <Badge
                      label={termStatusLabels[item.status]}
                      status={item.status}
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {years.find((year) => year.id === item.academicYearId)
                      ?.name ?? "—"}{" "}
                    · {dateInput(item.startsAt)} → {dateInput(item.endsAt)}
                  </p>
                </div>
                <Actions
                  onEdit={() => {
                    setEditingTerm(item);
                    setTermForm({
                      academicYearId: item.academicYearId,
                      name: item.name,
                      startsAt: dateInput(item.startsAt),
                      endsAt: dateInput(item.endsAt),
                      displayOrder: item.displayOrder,
                      status: item.status,
                    });
                    setTermModalOpen(true);
                  }}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "term",
                      id: item.id,
                      label: item.name,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>
        <GradeComponentConfiguration
          subjectId={selectedSubjectId}
          subjects={activeSubjects}
          onSubjectChange={setSelectedSubjectId}
        />
      </div>
      <Modal
        open={yearModalOpen}
        title={editingYear ? "Chỉnh sửa năm học" : "Thêm năm học"}
        onClose={() => setYearModalOpen(false)}
        footer={
          <Button type="submit" form="year-form" disabled={saving}>
            {editingYear ? "Lưu thay đổi" : "Thêm năm học"}
          </Button>
        }
      >
        <form
          id="year-form"
          onSubmit={(event) => void submitYear(event)}
          className="grid gap-4"
        >
          <Input
            label="Tên năm học"
            required
            value={yearForm.name}
            onChange={(event) =>
              setYearForm({ ...yearForm, name: event.target.value })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Ngày bắt đầu"
              type="date"
              required
              value={yearForm.startsAt}
              onChange={(event) =>
                setYearForm({ ...yearForm, startsAt: event.target.value })
              }
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              required
              value={yearForm.endsAt}
              onChange={(event) =>
                setYearForm({ ...yearForm, endsAt: event.target.value })
              }
            />
          </div>
          <Select
            label="Trạng thái"
            value={yearForm.status}
            onChange={(event) =>
              setYearForm({
                ...yearForm,
                status: event.target.value as YearStatus,
              })
            }
          >
            <option value="UPCOMING">Sắp diễn ra</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="COMPLETED">Đã hoàn tất</option>
          </Select>
        </form>
      </Modal>
      <Modal
        open={termModalOpen}
        title={editingTerm ? "Chỉnh sửa học kỳ" : "Thêm học kỳ"}
        onClose={() => setTermModalOpen(false)}
        footer={
          <Button
            type="submit"
            form="term-form"
            disabled={saving || editingTerm?.status === "LOCKED"}
          >
            {editingTerm ? "Lưu thay đổi" : "Thêm học kỳ"}
          </Button>
        }
      >
        <form
          id="term-form"
          onSubmit={(event) => void submitTerm(event)}
          className="grid gap-4"
        >
          <Select
            label="Năm học"
            required
            value={termForm.academicYearId}
            onChange={(event) =>
              setTermForm({ ...termForm, academicYearId: event.target.value })
            }
          >
            <option value="">Chọn năm học</option>
            {years.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tên học kỳ"
              required
              value={termForm.name}
              onChange={(event) =>
                setTermForm({ ...termForm, name: event.target.value })
              }
            />
            <Input
              label="Thứ tự"
              type="number"
              min={1}
              required
              value={termForm.displayOrder}
              onChange={(event) =>
                setTermForm({
                  ...termForm,
                  displayOrder: Number(event.target.value),
                })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Ngày bắt đầu"
              type="date"
              required
              value={termForm.startsAt}
              onChange={(event) =>
                setTermForm({ ...termForm, startsAt: event.target.value })
              }
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              required
              value={termForm.endsAt}
              onChange={(event) =>
                setTermForm({ ...termForm, endsAt: event.target.value })
              }
            />
          </div>
          <Select
            label="Trạng thái"
            value={termForm.status}
            disabled={editingTerm?.status === "LOCKED"}
            onChange={(event) =>
              setTermForm({
                ...termForm,
                status: event.target.value as TermStatus,
              })
            }
          >
            <option value="UPCOMING">Sắp diễn ra</option>
            <option value="ACTIVE">Đang diễn ra</option>
            <option value="COMPLETED">Đã hoàn tất</option>
            <option value="LOCKED">Đã khóa</option>
          </Select>
        </form>
      </Modal>
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa mềm"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={saving}
        confirmVariant="danger"
        confirmLabel="Xóa mềm"
      >
        <p>
          Dữ liệu <b>{deleteTarget?.label}</b> sẽ được ngừng sử dụng và không
          xóa vật lý.
        </p>
      </ConfirmationDialog>
    </div>
  );
}

function GradeComponentConfiguration({
  subjectId,
  subjects,
  onSubjectChange,
}: {
  subjectId: string;
  subjects: Subject[];
  onSubjectChange: (value: string) => void;
}) {
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [editing, setEditing] = useState<GradeComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeComponent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    requiredColumns: 1,
    weight: 10,
    teacherCanConfigureCalculation: false,
    sortOrder: 0,
    isActive: true,
  });
  const selectedSubject = subjects.find((item) => item.id === subjectId);
  const totalWeight = components
    .filter((item) => item.isActive)
    .reduce((sum, item) => sum + item.weight, 0);

  const load = useCallback(async () => {
    if (!subjectId) {
      setComponents([]);
      return;
    }
    try {
      setComponents(
        await academicDataService.getGradeComponents({
          subjectId,
          includeInactive: true,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải cấu hình điểm",
      );
    }
  }, [subjectId]);
  useEffect(() => {
    void load();
    setMessage("");
  }, [load]);
  function edit(item: GradeComponent) {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      requiredColumns: item.requiredColumns,
      weight: item.weight,
      teacherCanConfigureCalculation: item.teacherCanConfigureCalculation,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setModalOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!subjectId) return;
    setSaving(true);
    setError("");
    try {
      if (editing)
        await academicDataService.updateGradeComponent(editing.id, form);
      else
        await academicDataService.createGradeComponent({ ...form, subjectId });
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu thành phần điểm",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await academicDataService.deleteGradeComponent(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể xóa thành phần điểm",
      );
    } finally {
      setSaving(false);
    }
  }
  async function validate() {
    if (!subjectId) return;
    setSaving(true);
    setError("");
    try {
      const result =
        await academicDataService.validateGradeConfiguration(subjectId);
      setMessage(`Cấu hình hợp lệ: tổng trọng số ${result.totalWeight}%`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Tổng trọng số phải bằng 100%",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card xl:col-span-2">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Settings2 className="size-5" />
        </div>
        <div>
          <h2 className="font-black">Cấu hình thành phần điểm</h2>
          <p className="mt-1 text-xs text-slate-500">
            Thiết lập số cột, trọng số và quyền cấu hình cách tính cho từng môn
            học.
          </p>
        </div>
      </div>
      <div className="mt-5 max-w-md">
        <Select
          label="Môn học"
          value={subjectId}
          onChange={(event) => onSubjectChange(event.target.value)}
        >
          <option value="">Chọn môn học</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </Select>
      </div>
      {message ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="size-4" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
        <span className="font-semibold text-slate-600">
          {selectedSubject ? `Môn ${selectedSubject.name} · ` : ""}
          <b
            className={
              totalWeight === 100 ? "text-emerald-700" : "text-amber-600"
            }
          >
            {totalWeight}% / 100%
          </b>
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!subjectId || saving}
            onClick={() => void validate()}
          >
            Kiểm tra 100%
          </Button>
          <Button
            size="sm"
            disabled={!subjectId}
            onClick={() => {
              setEditing(null);
              setForm({
                code: "",
                name: "",
                requiredColumns: 1,
                weight: 10,
                teacherCanConfigureCalculation: false,
                sortOrder: 0,
                isActive: true,
              });
              setModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm thành phần
          </Button>
        </div>
      </div>
      {!subjectId ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
          Chọn môn học để cấu hình.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-3">Thành phần</th>
                <th className="px-3 py-3">Số cột</th>
                <th className="px-3 py-3">Trọng số</th>
                <th className="px-3 py-3">Giáo viên tự cấu hình</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-slate-400"
                  >
                    Chưa có thành phần điểm.
                  </td>
                </tr>
              ) : (
                components.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      !item.isActive
                        ? "bg-slate-50 text-slate-400"
                        : "hover:bg-slate-50/70"
                    }
                  >
                    <td className="px-3 py-3 font-bold">
                      {item.code} · {item.name}
                    </td>
                    <td className="px-3 py-3">{item.requiredColumns}</td>
                    <td className="px-3 py-3 font-bold">{item.weight}%</td>
                    <td className="px-3 py-3">
                      {item.teacherCanConfigureCalculation ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          Cho phép
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Theo hệ thống
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => edit(item)}
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={modalOpen}
        title={editing ? "Chỉnh sửa thành phần điểm" : "Thêm thành phần điểm"}
        onClose={() => setModalOpen(false)}
        width="max-w-2xl"
        footer={
          <Button type="submit" form="component-form" disabled={saving}>
            {editing ? "Lưu thay đổi" : "Thêm thành phần"}
          </Button>
        }
      >
        <form
          id="component-form"
          onSubmit={(event) => void submit(event)}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Mã thành phần"
              required
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value })
              }
            />
            <Input
              label="Tên thành phần"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Số cột điểm yêu cầu"
              type="number"
              min={1}
              max={20}
              required
              value={form.requiredColumns}
              onChange={(event) =>
                setForm({
                  ...form,
                  requiredColumns: Number(event.target.value),
                })
              }
            />
            <Input
              label="Trọng số (%)"
              type="number"
              min={0.01}
              max={100}
              step="0.01"
              required
              value={form.weight}
              onChange={(event) =>
                setForm({ ...form, weight: Number(event.target.value) })
              }
            />
            <Input
              label="Thứ tự hiển thị"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) =>
                setForm({ ...form, sortOrder: Number(event.target.value) })
              }
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={form.teacherCanConfigureCalculation}
              onChange={(event) =>
                setForm({
                  ...form,
                  teacherCanConfigureCalculation: event.target.checked,
                })
              }
            />
            <span>
              <b className="block">
                Cho phép giáo viên cấu hình cách tính chi tiết
              </b>
              <span className="text-xs text-slate-500">
                Giáo viên có thể khai báo cách gộp các cột điểm của thành phần
                này.
              </span>
            </span>
          </label>
        </form>
      </Modal>
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa mềm thành phần điểm"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        loading={saving}
        confirmVariant="danger"
        confirmLabel="Xóa mềm"
      >
        <p>
          Thành phần <b>{deleteTarget?.name}</b> sẽ được ngừng sử dụng.
        </p>
      </ConfirmationDialog>
    </section>
  );
}

function Header({
  title,
  description,
  onAdd,
}: {
  title: string;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-black">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="size-4" />
        Thêm
      </Button>
    </div>
  );
}
function Actions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" aria-label="Chỉnh sửa" onClick={onEdit}>
        <Edit3 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:bg-rose-50"
        aria-label="Xóa mềm"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
function Badge({ label, status }: { label: string; status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : status === "LOCKED"
        ? "bg-rose-100 text-rose-700"
        : status === "COMPLETED"
          ? "bg-slate-200 text-slate-600"
          : "bg-amber-100 text-amber-700";
  return (
    <span className={`ml-1 rounded-full px-2 py-1 text-[10px] ${tone}`}>
      {label}
    </span>
  );
}
