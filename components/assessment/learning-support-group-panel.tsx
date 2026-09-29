"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-range-picker";
import { CustomSelect, Input, Textarea } from "@/components/ui/form-control";
import { academicDataService, learningPlanService } from "@/lib/assessment-api";
import type {
  ClassTopic,
  LearningObjectiveEvidence,
  LearningPlan,
  LearningPlanScopeItem,
  SubjectSupportReport,
  SubjectSupportStudent,
} from "@/types/assessment";

const unclassified = "Chưa xác định chủ đề";
const examRisk = "Nguy cơ từ bài kiểm tra";
const genericTopics = new Set(["Kiến thức tổng hợp", "Chưa gắn chủ đề"]);

function groupStudents(
  students: SubjectSupportStudent[],
  hasMaterial: boolean,
) {
  const groups = new Map<
    string,
    { name: string; students: SubjectSupportStudent[] }
  >();
  for (const student of students) {
    if (student.level !== "HIGH" && student.level !== "WATCH") continue;
    if (!hasMaterial) {
      const group = groups.get(examRisk) ?? { name: examRisk, students: [] };
      group.students.push(student);
      groups.set(examRisk, group);
      continue;
    }
    const topics = [
      ...new Set(
        student.gaps
          .map((gap) => gap.topicName?.trim())
          .filter(
            (name): name is string => Boolean(name) && !genericTopics.has(name),
          ),
      ),
    ];
    for (const name of topics.length ? topics : [unclassified]) {
      const group = groups.get(name) ?? { name, students: [] };
      if (!group.students.some((item) => item.id === student.id))
        group.students.push(student);
      groups.set(name, group);
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.students.length - a.students.length ||
      a.name.localeCompare(b.name, "vi"),
  );
}

export function LearningSupportGroupPanel({
  examId,
  report,
}: {
  examId: string;
  report: SubjectSupportReport;
}) {
  const groups = useMemo(
    () =>
      groupStudents(
        report.students,
        report.materialContext?.available === true,
      ),
    [report.students, report.materialContext?.available],
  );
  const [groupName, setGroupName] = useState("");
  const group = groups.find((item) => item.name === groupName) ?? groups[0];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<LearningObjectiveEvidence[]>([]);
  const [topics, setTopics] = useState<ClassTopic[]>([]);
  const [plans, setPlans] = useState<LearningPlanScopeItem[]>([]);
  const [plansError, setPlansError] = useState("");
  const [objectiveId, setObjectiveId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [criteria, setCriteria] = useState("");
  const [threshold, setThreshold] = useState(70);
  const [dueAt, setDueAt] = useState("");
  const [proposalReady, setProposalReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    cohortId: string;
    plans: LearningPlan[];
  } | null>(null);
  const [delivery, setDelivery] = useState<{
    published: string[];
    failed: Array<{ planId: string; studentId: string; reason: string }>;
  } | null>(null);

  useEffect(() => {
    setSelectedIds(group?.students.map((student) => student.id) ?? []);
    setObjectiveId("");
    setMaterialId("");
    setTitle("");
    setSummary("");
    setCriteria("");
    setThreshold(70);
    setDueAt("");
    setProposalReady(false);
    setCreated(null);
    setDelivery(null);
  }, [group, report.version]);

  useEffect(() => {
    if (!report.materialContext?.available) return;
    let active = true;
    void Promise.all([
      learningPlanService.listObjectives(examId),
      academicDataService.getClassTopics(report.classId),
    ])
      .then(([loadedObjectives, loadedTopics]) => {
        if (!active) return;
        setObjectives(loadedObjectives);
        setTopics(
          loadedTopics.filter((topic) => topic.subjectId === report.subjectId),
        );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải mục tiêu và tài liệu",
          );
      });
    return () => {
      active = false;
    };
  }, [
    examId,
    report.classId,
    report.subjectId,
    report.materialContext?.available,
  ]);

  useEffect(() => {
    let active = true;
    void learningPlanService
      .listForScope(report.classId, report.subjectId)
      .then((items) => {
        if (active) setPlans(items);
      })
      .catch((cause) => {
        if (active)
          setPlansError(
            cause instanceof Error ? cause.message : "Không thể tải lộ trình",
          );
      });
    return () => {
      active = false;
    };
  }, [report.classId, report.subjectId]);

  const materials = useMemo(
    () =>
      topics.flatMap((topic) =>
        topic.materials
          .filter((material) => material.status === "READY")
          .map((material) => ({
            id: material.id,
            topicId: topic.id,
            label: `${topic.name} · ${material.originalName}`,
          })),
      ),
    [topics],
  );
  const topicObjectives = useMemo(
    () =>
      objectives.filter((item) => item.granularity === "TOPIC" && item.topicId),
    [objectives],
  );
  const unclassifiedCount = objectives.length - topicObjectives.length;
  const chosenObjective = topicObjectives.find(
    (item) => item.id === objectiveId,
  );

  useEffect(() => {
    if (!group || objectiveId) return;
    const matched = topicObjectives.find(
      (item) =>
        item.title.trim().toLocaleLowerCase("vi") ===
        group.name.trim().toLocaleLowerCase("vi"),
    );
    if (matched) setObjectiveId(matched.id);
  }, [group, objectiveId, topicObjectives]);

  const canSave = Boolean(
    group &&
    proposalReady &&
    selectedIds.length &&
    chosenObjective &&
    materialId &&
    title.trim() &&
    criteria.trim() &&
    Number.isInteger(threshold) &&
    threshold >= 0 &&
    threshold <= 100 &&
    !busy,
  );

  async function suggestGroupPlan() {
    if (!group || !selectedIds.length || !chosenObjective || busy) return;
    setBusy(true);
    setError("");
    setCreated(null);
    setDelivery(null);
    setProposalReady(false);
    try {
      const ideas = await Promise.all(
        selectedIds.map((studentId) =>
          learningPlanService.suggest(examId, studentId, chosenObjective.id),
        ),
      );
      const evidence = [
        ...new Set(
          ideas
            .flatMap((idea) => [idea.summary, idea.evidence])
            .filter((item): item is string => Boolean(item?.trim()))
            .map((item) => item.trim()),
        ),
      ];
      const suggestedMaterial =
        materials.find((item) => item.topicId === chosenObjective.topicId) ??
        materials[0];
      setMaterialId(suggestedMaterial?.id ?? "");
      setTitle(`Ôn tập ${chosenObjective.title}`);
      setSummary(
        `AI đề xuất cho ${selectedIds.length} học sinh cùng cần củng cố ${chosenObjective.title}.${
          evidence.length ? ` Căn cứ: ${evidence.join(" ")}` : ""
        }`,
      );
      setCriteria(
        `Hoàn thành tài liệu và đạt ít nhất 70% ở bài luyện, sau đó làm bài đánh giá lại cùng chủ đề.`,
      );
      setThreshold(70);
      setProposalReady(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tạo đề xuất lộ trình cho nhóm",
      );
    } finally {
      setBusy(false);
    }
  }

  async function approveAndPublish() {
    if (!canSave) return;
    setBusy(true);
    setError("");
    setCreated(null);
    setDelivery(null);
    try {
      const drafts = await learningPlanService.createDrafts(examId, {
        studentIds: selectedIds,
        objectiveId,
        title: title.trim(),
        summary: summary.trim(),
        successCriteria: criteria.trim(),
        targetAccuracyPercent: threshold,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        tasks: [
          {
            kind: "MATERIAL",
            title: `Đọc và ôn ${chosenObjective?.title ?? group?.name ?? "kiến thức"}`,
            description:
              "Đọc tài liệu đã gắn và chuẩn bị cho bài đánh giá lại.",
            materialId,
          },
          {
            kind: "PRACTICE",
            title: `Luyện tập ${chosenObjective?.title ?? group?.name ?? "kiến thức"}`,
            description:
              "Mỗi học sinh làm bộ câu luyện riêng đúng mục tiêu kiến thức trước khi đánh giá lại.",
          },
        ],
      });
      setCreated(drafts);
      const createdAt = new Date().toISOString();
      const optimisticPlans: LearningPlanScopeItem[] = drafts.plans.map(
        (plan) => ({
          id: plan.id,
          cohortId: plan.cohortId,
          studentId: plan.studentId,
          title: plan.title,
          status: plan.status,
          createdAt,
        }),
      );
      setPlans((current) => [
        ...optimisticPlans,
        ...current.filter(
          (plan) =>
            !optimisticPlans.some((createdPlan) => createdPlan.id === plan.id),
        ),
      ]);
      const published = await learningPlanService.publishCohort(
        drafts.cohortId,
      );
      setDelivery(published);
      const publishedIds = new Set(published.published);
      const optimisticPublished = optimisticPlans.map((plan) => ({
        ...plan,
        status: publishedIds.has(plan.id) ? ("ASSIGNED" as const) : plan.status,
      }));
      setPlans((current) =>
        current.map((plan) =>
          publishedIds.has(plan.id)
            ? { ...plan, status: "ASSIGNED" as const }
            : plan,
        ),
      );
      try {
        const refreshed = await learningPlanService.listForScope(
          report.classId,
          report.subjectId,
        );
        setPlans([
          ...refreshed,
          ...optimisticPublished.filter(
            (plan) => !refreshed.some((item) => item.id === plan.id),
          ),
        ]);
      } catch {
        setPlansError(
          "Lộ trình đã được xử lý nhưng chưa tải lại được danh sách mới.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể duyệt và giao lộ trình cho nhóm",
      );
    } finally {
      setBusy(false);
    }
  }

  const cohorts = [
    ...new Map(
      plans.map((plan) => [
        plan.cohortId,
        plans.filter((item) => item.cohortId === plan.cohortId),
      ]),
    ).values(),
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900">Nhóm cần hỗ trợ</h2>
          <p className="mt-1 text-sm text-slate-500">
            {report.materialContext?.available
              ? "Gom theo chủ đề của câu làm sai hoặc bỏ trống. Một sinh viên có thể thuộc nhiều nhóm."
              : "Chỉ gom theo mức nguy cơ từ kết quả bài kiểm tra vì môn học chưa có tài liệu."}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {groups.length} nhóm
        </span>
      </div>
      {groups.length ? (
        <>
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Chọn nhóm kiến thức"
          >
            {groups.map((item) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={group?.name === item.name}
                onClick={() => setGroupName(item.name)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${group?.name === item.name ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {item.name}{" "}
                <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-xs">
                  {item.students.length}
                </span>
              </button>
            ))}
          </div>
          {group ? (
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">{group.name}</h3>
                <span className="text-xs text-slate-500">
                  Đã chọn {selectedIds.length}/{group.students.length} sinh viên
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.students.map((student) => (
                  <label
                    key={student.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${selectedIds.includes(student.id) ? "border-brand-200 bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border-slate-300 accent-brand-600 focus:ring-2 focus:ring-blue-100"
                      checked={selectedIds.includes(student.id)}
                      onChange={(event) => {
                        setProposalReady(false);
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, student.id]
                            : current.filter((id) => id !== student.id),
                        );
                      }}
                    />
                    <span className="min-w-0 truncate">{student.fullName}</span>
                    <span
                      className={`ml-auto shrink-0 text-xs font-semibold ${student.level === "HIGH" ? "text-rose-700" : "text-amber-700"}`}
                    >
                      {student.level === "HIGH" ? "Ưu tiên" : "Theo dõi"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {report.materialContext?.available ? (
            <details className="mt-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4">
              <summary className="cursor-pointer font-bold text-brand-800">
                AI đề xuất lộ trình cho nhóm đã chọn
              </summary>
              <p className="mt-2 text-sm text-slate-600">
                AI tổng hợp phần kiến thức chung cần củng cố và tạo bản đề xuất.
                Giáo viên kiểm tra, chỉnh sửa rồi mới duyệt giao. Mỗi học sinh
                vẫn có hồ sơ, bài luyện và tiến độ riêng.
              </p>
              {unclassifiedCount > 0 ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {unclassifiedCount} câu hỏi chưa gắn chủ đề không được đưa vào
                  mục tiêu của lộ trình nhóm vì không xác định được kiến thức
                  chung. Hãy gắn chủ đề trong{" "}
                  <Link
                    href="/teacher/question-bank"
                    className="font-semibold underline"
                  >
                    Ngân hàng câu hỏi
                  </Link>
                  . Bài làm đã nộp có thể vẫn giữ chủ đề cũ.
                </p>
              ) : null}
              {topicObjectives.length === 0 ? (
                <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Chưa có mục tiêu theo chủ đề cho lớp/môn này. Hiện chưa thể
                  tạo lộ trình nhóm; vẫn có thể theo dõi nguy cơ từ bài kiểm
                  tra.
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CustomSelect
                  label="Mục tiêu kiến thức (chủ đề cần cải thiện)"
                  value={objectiveId}
                  options={topicObjectives.map((objective) => ({
                    value: objective.id,
                    label: objective.title,
                  }))}
                  placeholder={
                    topicObjectives.length
                      ? "Chọn chủ đề cần cải thiện"
                      : "Chưa có chủ đề hợp lệ"
                  }
                  onValueChange={(value) => {
                    setObjectiveId(value);
                    setProposalReady(false);
                  }}
                  disabled={topicObjectives.length === 0}
                  ariaLabel="Chọn chủ đề cần cải thiện"
                />
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    disabled={busy || !selectedIds.length || !chosenObjective}
                    onClick={() => void suggestGroupPlan()}
                  >
                    {busy ? "AI đang tạo đề xuất..." : "Tạo đề xuất bằng AI"}
                  </Button>
                </div>
              </div>
              {proposalReady ? (
                <>
                  <p
                    role="status"
                    className="mt-4 rounded-lg border border-blue-200 bg-white p-3 text-sm text-blue-800"
                  >
                    Đây là bản AI đề xuất xem trước, chưa phải lộ trình đã tạo.
                    Giáo viên có thể chỉnh sửa rồi duyệt để giao cho nhóm.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <CustomSelect
                      label="Tài liệu đã gắn với môn"
                      value={materialId}
                      options={materials.map((material) => ({
                        value: material.id,
                        label: material.label,
                      }))}
                      placeholder="Chọn tài liệu"
                      onValueChange={setMaterialId}
                      ariaLabel="Chọn tài liệu đã gắn với môn"
                    />
                    <Input
                      label="Tên lộ trình"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={`Ôn tập ${group?.name ?? "chủ đề"}`}
                    />
                    <DateTimePicker
                      label="Hạn hoàn thành"
                      value={dueAt}
                      onChange={setDueAt}
                    />
                    <div className="md:col-span-2">
                      <Textarea
                        label="Mục đích và căn cứ"
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                        placeholder="Giải thích vì sao nhóm này cần ôn tập"
                      />
                    </div>
                    <Textarea
                      label="Tiêu chí đạt sau đánh giá lại"
                      value={criteria}
                      onChange={(event) => setCriteria(event.target.value)}
                      placeholder="Điều kiện cụ thể để xác nhận tiến bộ"
                    />
                    <Input
                      label="Ngưỡng đúng (%)"
                      type="number"
                      min="0"
                      max="100"
                      value={threshold}
                      onChange={(event) =>
                        setThreshold(Number(event.target.value))
                      }
                    />
                  </div>
                </>
              ) : null}
              {error ? (
                <p role="alert" className="mt-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
              {proposalReady ? (
                <Button
                  className="mt-4"
                  disabled={!canSave}
                  onClick={() => void approveAndPublish()}
                >
                  {busy
                    ? "Đang tạo và giao..."
                    : `Duyệt và giao cho ${selectedIds.length} học sinh`}
                </Button>
              ) : null}
              {created ? (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  <p className="font-bold">
                    Đã tạo {created.plans.length} hồ sơ lộ trình cho nhóm.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {created.plans.map((plan) => (
                      <Link
                        key={plan.id}
                        href={`/teacher/learning-plans/${plan.id}`}
                        className="rounded-lg bg-white px-2.5 py-1 font-semibold text-brand-700 hover:underline"
                      >
                        {group.students.find(
                          (student) => student.id === plan.studentId,
                        )?.fullName ?? plan.studentId}{" "}
                        →
                      </Link>
                    ))}
                  </div>
                  {delivery ? (
                    <div className="mt-3 rounded-lg bg-white p-3">
                      <p className="font-bold">
                        Đã giao {delivery.published.length} lộ trình;{" "}
                        {delivery.failed.length} cần xử lý thêm.
                      </p>
                      {delivery.failed.map((item) => (
                        <p key={item.planId} className="mt-1 text-amber-800">
                          <Link
                            href={`/teacher/learning-plans/${item.planId}`}
                            className="font-semibold underline"
                          >
                            {group.students.find(
                              (student) => student.id === item.studentId,
                            )?.fullName ?? item.studentId}
                          </Link>
                          : {item.reason}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </details>
          ) : (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Chưa có tài liệu được gắn và xử lý sẵn sàng; hiện chỉ theo dõi
              nguy cơ từ bài kiểm tra.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Chưa có sinh viên được xếp mức cần hỗ trợ từ các bài kiểm tra.
        </p>
      )}
      <details className="mt-4 rounded-xl border border-slate-200 p-3">
        <summary className="cursor-pointer font-bold text-slate-800">
          Lộ trình đã tạo · {cohorts.length} đợt
        </summary>
        {!cohorts.length && proposalReady ? (
          <p className="mt-2 text-xs text-slate-500">
            Bản AI đề xuất phía trên chỉ là bản xem trước. Lộ trình sẽ xuất hiện
            ở đây sau khi giáo viên bấm “Duyệt và giao”.
          </p>
        ) : null}
        {plans.length === 200 ? (
          <p className="mt-2 text-xs text-slate-500">
            Đang hiển thị 200 lộ trình gần nhất.
          </p>
        ) : null}
        {plansError ? (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {plansError}
          </p>
        ) : null}
        {cohorts.length ? (
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {cohorts.map((cohort) => (
              <div
                key={cohort[0].cohortId}
                className="rounded-lg bg-slate-50 p-3 text-sm"
              >
                <p className="font-bold text-slate-800">
                  {cohort[0].title} · {cohort.length} sinh viên
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {cohort.filter((plan) => plan.status === "DRAFT").length} bản
                  nháp ·{" "}
                  {
                    cohort.filter(
                      (plan) =>
                        plan.status !== "DRAFT" && plan.status !== "CANCELLED",
                    ).length
                  }{" "}
                  đã giao
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cohort.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/teacher/learning-plans/${plan.id}`}
                      className="rounded-md bg-white px-2 py-1 font-semibold text-brand-700 hover:underline"
                    >
                      {report.students.find(
                        (student) => student.id === plan.studentId,
                      )?.fullName ?? plan.studentId}{" "}
                      ·{" "}
                      {plan.status === "DRAFT"
                        ? "Nháp"
                        : plan.status === "CANCELLED"
                          ? "Đã hủy"
                          : "Đã giao"}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !plansError ? (
          <p className="mt-2 text-sm text-slate-500">
            Chưa có lộ trình cho môn này.
          </p>
        ) : null}
      </details>
    </section>
  );
}
