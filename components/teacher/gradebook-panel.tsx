"use client";

import { useEffect, useState } from "react";
import { academicDataService } from "@/lib/assessment-api";
import { gradebookService } from "@/lib/gradebook-api";
import type { TeacherAssignedClass, Term } from "@/types/assessment";
import type {
  GradebookView,
  GradeMark,
  GradeMarks,
  GradePolicy,
} from "@/types/gradebook";
import { outcomeText } from "@/components/assessment/official-grade-report";
import { usePermissions } from "@/context/permissions-context";

const field =
  "rounded-lg border border-slate-200 bg-white p-2 text-sm disabled:bg-slate-100";
export function GradebookPanel({
  schoolClass,
}: {
  schoolClass: TeacherAssignedClass;
}) {
  const { can } = usePermissions();
  const canWrite = can("teaching.update") || can("academic.update");
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState(schoolClass.subjects[0]?.id ?? "");
  const [view, setView] = useState<GradebookView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [policy, setPolicy] = useState<GradePolicy>({
    assessmentMode: "NUMERIC",
    annualPeriods: 70,
    specialized: false,
  });
  const [editing, setEditing] = useState("");
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [marks, setMarks] = useState<GradeMarks>({
    regular: [],
    midterm: null,
    final: null,
  });
  const [comment, setComment] = useState("");
  useEffect(() => {
    let active = true;
    academicDataService
      .getTerms(schoolClass.academicYearId, true)
      .then((items) => {
        if (!active) return;
        setTerms(items);
        setTermId(
          (items.find((item) => item.status === "ACTIVE") ?? items[0])?.id ??
            "",
        );
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không tải được học kỳ",
          );
      });
    return () => {
      active = false;
    };
  }, [schoolClass.academicYearId]);
  useEffect(() => {
    let active = true;
    setView(null);
    setEditing("");
    setEditingPolicy(false);
    setError("");
    if (termId && subjectId)
      gradebookService
        .get({ classId: schoolClass.id, subjectId, termId })
        .then((data) => {
          if (!active) return;
          setView(data);
          setPolicy(
            data.book ?? {
              assessmentMode: "NUMERIC",
              annualPeriods: 70,
              specialized: false,
            },
          );
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error ? cause.message : "Không tải được sổ điểm",
            );
        });
    return () => {
      active = false;
    };
  }, [schoolClass.id, termId, subjectId, refresh]);
  const locked =
    !canWrite ||
    saving ||
    !view ||
    ["COMPLETED", "LOCKED"].includes(view.term.status);
  async function configure() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await gradebookService.configure({
        classId: schoolClass.id,
        subjectId,
        termId,
        assessmentMode: policy.assessmentMode,
        annualPeriods: policy.annualPeriods,
        specialized: policy.specialized,
        revision: view?.book?.revision ?? 0,
      });
      setRefresh((value) => value + 1);
      setNotice("Đã lưu kế hoạch đánh giá.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  }
  async function save() {
    if (!view?.book) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await gradebookService.save(view.book.id, {
        studentId: editing,
        marks,
        comment,
        revision: view.book.revision,
      });
      setEditing("");
      setRefresh((value) => value + 1);
      setNotice("Đã lưu điểm và nhận xét.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  }
  function markInput(
    value: GradeMark,
    label: string,
    onChange: (mark: GradeMark) => void,
  ) {
    return (
      <label className="grid gap-1 text-xs">
        {label}
        {view?.book?.assessmentMode === "COMMENT" ? (
          <select
            aria-label={label}
            className={field}
            disabled={locked}
            value={value ?? ""}
            onChange={(event) =>
              onChange((event.target.value || null) as GradeMark)
            }
          >
            <option value="">Chưa đánh giá</option>
            <option value="PASS">Đạt</option>
            <option value="FAIL">Chưa đạt</option>
          </select>
        ) : (
          <input
            aria-label={label}
            className={`${field} w-24`}
            disabled={locked}
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={value ?? ""}
            onChange={(event) =>
              onChange(
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
        )}
      </label>
    );
  }
  return (
    <section className="my-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">Nhập điểm học kỳ</h2>
      <p className="my-2 text-xs text-slate-500">
        Chọn các kết quả đánh giá chính thức để ghi sổ. Thường xuyên hệ số 1,
        giữa kỳ 2, cuối kỳ 3. Điểm bỏ trống chưa được tính trung bình.
      </p>
      <div className="my-3 flex flex-wrap gap-3">
        <select
          aria-label="Môn nhập điểm"
          className={field}
          disabled={saving || !!editing}
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
        >
          {schoolClass.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.vietnameseName || subject.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Học kỳ nhập điểm"
          className={field}
          disabled={saving || !!editing}
          value={termId}
          onChange={(event) => setTermId(event.target.value)}
        >
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
        <button
          className={field}
          disabled={saving}
          onClick={() => {
            setNotice("");
            setRefresh((value) => value + 1);
          }}
        >
          Tải lại
        </button>
      </div>
      {error ? (
        <p role="alert" className="my-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="my-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}
      {view && (!view.book || editingPolicy) ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3">
          <label className="grid gap-1 text-xs">
            Hình thức
            <select
              className={field}
              disabled={locked}
              value={policy.assessmentMode}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  assessmentMode: event.target
                    .value as GradePolicy["assessmentMode"],
                  specialized: false,
                })
              }
            >
              <option value="NUMERIC">Điểm số và nhận xét</option>
              <option value="COMMENT">Nhận xét Đạt/Chưa đạt</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Số tiết môn học/năm (không gồm chuyên đề)
            <input
              className={`${field} w-28`}
              disabled={locked}
              type="number"
              min={35}
              max={1000}
              value={policy.annualPeriods}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  annualPeriods: Number(event.target.value),
                })
              }
            />
          </label>
          {policy.assessmentMode === "NUMERIC" ? (
            <label className="text-sm">
              <input
                type="checkbox"
                disabled={locked}
                checked={policy.specialized}
                onChange={(event) =>
                  setPolicy({ ...policy, specialized: event.target.checked })
                }
              />{" "}
              Ghi thêm 1 điểm cụm chuyên đề trong học kỳ này
            </label>
          ) : null}
          <button
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={locked}
            onClick={() => void configure()}
          >
            {view.book ? "Cập nhật kế hoạch" : "Tạo sổ điểm"}
          </button>
          {editingPolicy ? (
            <button disabled={saving} onClick={() => setEditingPolicy(false)}>
              Hủy
            </button>
          ) : null}
        </div>
      ) : null}
      {view?.book ? (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {view.requiredRegular} cột TX · 1 giữa kỳ · 1 cuối kỳ
            {["COMPLETED", "LOCKED"].includes(view.term.status)
              ? " · Học kỳ đã kết thúc/khóa"
              : ""}
            {!canWrite ? " · Chỉ xem" : ""}
          </p>
          {!editingPolicy &&
          !view.students.some((student) => student.record) ? (
            <button
              className="mb-3 text-sm text-brand-700 disabled:text-slate-400"
              disabled={locked || !!editing}
              onClick={() => setEditingPolicy(true)}
            >
              Sửa kế hoạch trước khi nhập điểm
            </button>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Học sinh</th>
                  <th className="p-2">Kết quả</th>
                  <th className="p-2">Nhận xét</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {view.students.map((student) => (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="p-2">
                      {student.fullName}
                      <span className="ml-2 text-xs text-slate-500">
                        {student.accountName}
                      </span>
                    </td>
                    <td className="p-2">{outcomeText(student.outcome)}</td>
                    <td className="p-2">{student.record?.comment || "—"}</td>
                    <td className="p-2">
                      <button
                        disabled={locked || !!editing || editingPolicy}
                        className="text-brand-700 disabled:text-slate-400"
                        onClick={() => {
                          setEditing(student.id);
                          setMarks(
                            student.record?.marks ?? {
                              regular: Array.from(
                                { length: view.requiredRegular ?? 0 },
                                () => null,
                              ),
                              midterm: null,
                              final: null,
                            },
                          );
                          setComment(student.record?.comment ?? "");
                          setNotice("");
                        }}
                      >
                        Nhập / sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!view.students.length ? (
            <p className="p-3 text-sm text-slate-500">
              Lớp chưa có học sinh đang học.
            </p>
          ) : null}
        </>
      ) : null}
      {editing ? (
        <form
          className="mt-4 rounded-xl border border-brand-200 bg-blue-50/30 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h3 className="mb-3 font-bold">
            {view?.students.find((student) => student.id === editing)?.fullName}
          </h3>
          <div className="flex flex-wrap gap-3">
            {marks.regular.map((mark, index) => (
              <div key={index}>
                {markInput(mark, `TX ${index + 1}`, (value) =>
                  setMarks({
                    ...marks,
                    regular: marks.regular.map((old, i) =>
                      i === index ? value : old,
                    ),
                  }),
                )}
              </div>
            ))}
            {markInput(marks.midterm, "Giữa kỳ", (value) =>
              setMarks({ ...marks, midterm: value }),
            )}
            {markInput(marks.final, "Cuối kỳ", (value) =>
              setMarks({ ...marks, final: value }),
            )}
          </div>
          <label className="my-3 grid gap-1 text-xs">
            Nhận xét
            <textarea
              className={field}
              disabled={saving}
              maxLength={2000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={locked}
            className="mr-3 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu điểm"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing("")}
          >
            Hủy
          </button>
        </form>
      ) : null}
    </section>
  );
}
