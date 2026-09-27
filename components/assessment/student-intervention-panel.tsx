"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { academicDataService, examService, learningPlanService } from "@/lib/assessment-api";
import { ApiError } from "@/lib/auth-api";
import { TeacherImprovementPanel } from "@/components/assessment/learning-improvement-panel";
import type { ClassTopic, ExamClassReportStudent, LearningPlan, LearningPlanDraftInput, StudyAiFeedback, StudyAiReview, StudyEvidenceBundle, TeacherStudyAnalysis } from "@/types/assessment";

const reasons: Record<StudyAiFeedback["reason"], string> = {
  WRONG_KNOWLEDGE: "Sai kiến thức", OUT_OF_SCOPE: "Ngoài phạm vi", INSUFFICIENT_EVIDENCE: "Thiếu bằng chứng", UNCLEAR: "Chưa rõ",
};

export function StudentInterventionPanel({ examId, studentId, attemptId, classId, subjectId }: {
  examId: string; studentId: string; attemptId: string; classId: string; subjectId: string;
}) {
  const [analysis, setAnalysis] = useState<TeacherStudyAnalysis | null>(null);
  const [missing, setMissing] = useState(false);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [students, setStudents] = useState<ExamClassReportStudent[]>([]);
  const [topics, setTopics] = useState<ClassTopic[]>([]);
  const [evidence, setEvidence] = useState<StudyEvidenceBundle | null>(null);
  const [selected, setSelected] = useState<string[]>([studentId]);
  const [objectiveId, setObjectiveId] = useState("");
  const [draft, setDraft] = useState<LearningPlanDraftInput>({ studentIds: [studentId], objectiveId: "", title: "", summary: "", successCriteria: "", tasks: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function reload() {
    const [planList, report, topicList, bundle] = await Promise.all([
      learningPlanService.listTeacher(examId), examService.getClassReport(examId), academicDataService.getClassTopics(classId), examService.getStudentEvidence(examId, studentId),
    ]);
    setPlans(planList); setStudents(report.students); setTopics(topicList.filter((topic) => topic.subjectId === subjectId)); setEvidence(bundle);
    try { setAnalysis(await examService.getTeacherStudyAnalysis(examId, studentId, attemptId)); setMissing(false); }
    catch (cause) { if (cause instanceof ApiError && cause.status === 404) setMissing(true); else throw cause; }
  }

  useEffect(() => {
    let live = true;
    Promise.all([learningPlanService.listTeacher(examId), examService.getClassReport(examId), academicDataService.getClassTopics(classId), examService.getStudentEvidence(examId, studentId), examService.getTeacherStudyAnalysis(examId, studentId, attemptId).catch((cause) => {
      if (cause instanceof ApiError && cause.status === 404) return null;
      throw cause;
    })]).then(([planList, report, topicList, bundle, study]) => {
      if (!live) return;
      setPlans(planList); setStudents(report.students); setTopics(topicList.filter((topic) => topic.subjectId === subjectId)); setEvidence(bundle);
      setAnalysis(study); setMissing(!study);
    }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu can thiệp"); });
    return () => { live = false; };
  }, [examId, studentId, attemptId, classId, subjectId]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); await reload(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu thay đổi"); }
    finally { setBusy(false); }
  }

  const materials = useMemo(() => topics.flatMap((topic) => topic.materials.filter((item) => item.status === "READY").map((item) => ({ id: item.id, label: `${topic.name} · ${item.originalName}` }))), [topics]);
  const targets = analysis ? [
    { key: "SUMMARY", label: "Tổng quan", text: analysis.rawReport.summary, source: `Tạo lúc ${new Date(analysis.generatedAt).toLocaleString("vi-VN")} · ${analysis.report.historyAnalysisCount ?? 0} bài học lịch sử cùng môn/lớp` },
    ...analysis.rawReport.weakAreas.flatMap((area) => [
      { key: `AREA:${area.id}:DIAGNOSIS`, label: `${area.topicName} · Nhận định`, text: area.diagnosis, source: `${area.missedCount}/${area.totalQuestions} câu chưa đúng · ${area.sourceType} · ${area.sourceReferences.map((ref) => `${ref.documentName} trang ${ref.page}`).join(", ") || "Chưa có trích dẫn trang"}` },
      { key: `AREA:${area.id}:REVIEW`, label: `${area.topicName} · Gợi ý ôn`, text: area.reviewSummary, source: `${area.missedCount}/${area.totalQuestions} câu chưa đúng · ${area.sourceType} · ${area.sourceReferences.map((ref) => `${ref.documentName} trang ${ref.page}`).join(", ") || "Chưa có trích dẫn trang"}` },
    ]),
    ...(analysis.rawPracticeQuestions ?? []).map((question) => ({ key: `QUESTION:${question.id}`, label: `Câu luyện tập · ${question.topicName}`, text: question.content, source: `${question.sourceType} · ${question.options.map((option) => `${option.label}. ${option.text}${question.correctOptionIds?.includes(option.id) ? " (đúng)" : ""}`).join(" | ")} · ${question.explanation ?? "Chưa có giải thích"}` })),
  ] : [];

  return <section className="mb-5 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
    <div><h2 className="text-lg font-black">Theo dõi AI và kế hoạch học</h2><p className="text-sm text-slate-500">Báo cáo AI là đề xuất; giáo viên duyệt riêng từng nhận định trước khi dùng để can thiệp. Phản hồi được lưu để xử lý, không tự huấn luyện mô hình.</p></div>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    {message ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
    {missing ? <Button disabled={busy} onClick={() => void run(() => examService.createTeacherStudyAnalysis(examId, studentId, attemptId), "Đã tạo báo cáo AI cá nhân")}>Tạo báo cáo AI cá nhân</Button> : null}
    {analysis ? <div className="space-y-3">
      <p className="text-sm text-slate-600">Điểm {analysis.report.performance.score ?? "chưa chấm"}/{analysis.report.performance.totalPoints} · {analysis.report.performance.correctCount}/{analysis.report.performance.totalQuestions} câu đúng · AI: {analysis.report.aiStatus}</p>
      {analysis.feedback.length ? <details className="rounded-lg bg-amber-50 p-3 text-sm"><summary className="cursor-pointer font-bold">Phản hồi đã gửi ({analysis.feedback.length})</summary><ul className="mt-2 space-y-1">{analysis.feedback.map((item) => <li key={item.id}>{item.targetKey} · {reasons[item.reason]} · {item.comment || "Không có ghi chú"}</li>)}</ul></details> : null}
      {targets.map((target) => <ReviewTarget key={target.key} target={target} review={analysis.reviews.find((item) => item.targetKey === target.key)} feedback={analysis.feedback.filter((item) => item.targetKey === target.key)} history={analysis.reviewHistory.filter((item) => item.reviewId === analysis.reviews.find((review) => review.targetKey === target.key)?.id)} busy={busy} onReview={(input) => run(() => examService.reviewStudyAi(examId, studentId, attemptId, { targetKey: target.key, ...input }), "Đã lưu quyết định duyệt")} onFeedback={(input) => run(() => examService.submitTeacherAiFeedback(examId, studentId, attemptId, { targetKey: target.key, ...input }), "Đã ghi nhận phản hồi")} />)}
    </div> : null}

    <div className="border-t border-slate-200 pt-5">
      <h3 className="font-black">Tạo lộ trình học thực tế</h3>
      <p className="mt-1 text-sm text-slate-500">Chọn mục tiêu, người nhận và tài liệu/bộ luyện. AI chỉ gợi ý bản nháp; giáo viên kiểm tra rồi mới giao. Mỗi người cần có mốc ban đầu đã xác nhận.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">Mục tiêu kiến thức
          <select className="mt-1 w-full rounded-lg border p-2" value={objectiveId} onChange={(event) => { setObjectiveId(event.target.value); setDraft((current) => ({ ...current, objectiveId: event.target.value })); }}>
            <option value="">Chọn mục tiêu</option>{[...new Map((evidence?.items ?? []).filter((item) => item.objective).map((item) => [item.objectiveId, item.objective!] as const)).values()].map((objective) => <option key={objective.id} value={objective.id}>{objective.title}{evidence?.baselines.some((item) => item.objectiveId === objective.id) ? " · đã có mốc" : " · chưa có mốc"}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Hoặc nhập mã mục tiêu từ bảng bằng chứng
          <input className="mt-1 w-full rounded-lg border p-2" value={objectiveId} onChange={(event) => { setObjectiveId(event.target.value); setDraft((current) => ({ ...current, objectiveId: event.target.value })); }} placeholder="ObjectId mục tiêu" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {students.filter((item) => item.selectedAttempt).map((item) => <label key={item.id} className="rounded-lg border px-2 py-1 text-sm"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} /> {item.fullName}</label>)}
      </div>
      <Button className="mt-3" variant="outline" disabled={busy || !objectiveId} onClick={() => void run(async () => { const idea = await learningPlanService.suggest(examId, studentId, objectiveId); setDraft((current) => ({ ...current, objectiveId, title: idea.title, summary: idea.summary, tasks: idea.tasks })); }, "Đã lấy gợi ý; hãy kiểm tra và bổ sung tiêu chí đạt")}>Lấy gợi ý cho học sinh này</Button>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm">Tên lộ trình<input className="mt-1 w-full rounded-lg border p-2" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <label className="text-sm">Hạn chung<input type="datetime-local" className="mt-1 w-full rounded-lg border p-2" value={draft.dueAt ?? ""} onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))} /></label>
        <label className="text-sm md:col-span-2">Mục đích và căn cứ<textarea className="mt-1 w-full rounded-lg border p-2" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} /></label>
        <label className="text-sm">Tiêu chí đạt sau đánh giá lại<textarea className="mt-1 w-full rounded-lg border p-2" value={draft.successCriteria} onChange={(event) => setDraft((current) => ({ ...current, successCriteria: event.target.value }))} /></label>
        <label className="text-sm">Ngưỡng đúng (%) do giáo viên đặt trước<input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border p-2" value={draft.targetAccuracyPercent ?? ""} onChange={(event) => setDraft((current) => ({ ...current, targetAccuracyPercent: event.target.value === "" ? undefined : Number(event.target.value) }))} /></label>
      </div>
      <div className="mt-3 space-y-3">{draft.tasks.map((task, index) => <div key={index} className="rounded-xl border p-3">
        <div className="grid gap-2 md:grid-cols-2"><select className="rounded-lg border p-2" value={task.kind} onChange={(event) => setDraft((current) => ({ ...current, tasks: current.tasks.map((item, i) => i === index ? { ...item, kind: event.target.value as "MATERIAL" | "PRACTICE", materialId: undefined, practiceSetId: undefined } : item) }))}><option value="PRACTICE">Bài luyện đúng mục tiêu</option><option value="MATERIAL">Đọc tài liệu</option></select><input className="rounded-lg border p-2" value={task.title} placeholder="Tên nhiệm vụ" onChange={(event) => setDraft((current) => ({ ...current, tasks: current.tasks.map((item, i) => i === index ? { ...item, title: event.target.value } : item) }))} /></div>
        <textarea className="mt-2 w-full rounded-lg border p-2" value={task.description} placeholder="Hướng dẫn" onChange={(event) => setDraft((current) => ({ ...current, tasks: current.tasks.map((item, i) => i === index ? { ...item, description: event.target.value } : item) }))} />
        {task.kind === "MATERIAL" ? <select className="mt-2 w-full rounded-lg border p-2" value={task.materialId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, tasks: current.tasks.map((item, i) => i === index ? { ...item, materialId: event.target.value } : item) }))}><option value="">Chọn tài liệu đã duyệt và gán cho lớp</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.label}</option>)}</select> : null}
        <Button variant="ghost" size="sm" onClick={() => setDraft((current) => ({ ...current, tasks: current.tasks.filter((_, i) => i !== index) }))}>Bỏ nhiệm vụ</Button>
      </div>)}</div>
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDraft((current) => ({ ...current, tasks: [...current.tasks, { kind: "MATERIAL", title: "Đọc tài liệu", description: "", materialId: undefined }] }))}>Thêm tài liệu</Button><Button variant="outline" onClick={() => setDraft((current) => ({ ...current, tasks: [...current.tasks, { kind: "PRACTICE", title: "Luyện tập", description: "" }] }))}>Thêm bài luyện</Button><Button disabled={busy || !objectiveId || !selected.length || !draft.tasks.length || !draft.title.trim() || !draft.successCriteria.trim() || draft.targetAccuracyPercent === undefined || draft.targetAccuracyPercent < 0 || draft.targetAccuracyPercent > 100} onClick={() => void run(async () => { await learningPlanService.createDrafts(examId, { ...draft, objectiveId, studentIds: selected, dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : undefined }); }, "Đã lưu bản nháp cho từng học sinh")}>Lưu bản nháp</Button></div>
    </div>
    <div className="border-t border-slate-200 pt-5"><h3 className="font-black">Lộ trình của lớp từ bài kiểm tra này</h3><div className="mt-3 space-y-3">{plans.map((plan) => <TeacherPlan key={plan.id} plan={plan} studentName={students.find((item) => item.id === plan.studentId)?.fullName ?? plan.studentId} busy={busy} run={run} onChanged={reload} />)}{!plans.length ? <p className="text-sm text-slate-500">Chưa có lộ trình.</p> : null}</div></div>
  </section>;
}

function ReviewTarget({ target, review, feedback, history, busy, onReview, onFeedback }: {
  target: { key: string; label: string; text: string; source: string }; review?: StudyAiReview; feedback: StudyAiFeedback[]; history: Array<StudyAiReview & { reviewId: string }>; busy: boolean;
  onReview: (input: { decision: StudyAiReview["decision"]; effectiveText?: string; reason: string; expectedVersion: number }) => Promise<void>;
  onFeedback: (input: { reason: StudyAiFeedback["reason"]; comment?: string }) => Promise<void>;
}) {
  const [decision, setDecision] = useState<StudyAiReview["decision"]>("CONFIRMED");
  const [edit, setEdit] = useState(""); const [why, setWhy] = useState("");
  const [flag, setFlag] = useState<StudyAiFeedback["reason"]>("UNCLEAR"); const [comment, setComment] = useState("");
  return <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-bold">{target.label} · {review ? review.decision : "AI đề xuất"}</summary>
      <p className="mt-2 whitespace-pre-wrap text-slate-600">Bản gốc AI: {target.text}</p><p className="mt-1 text-xs text-slate-500">Nguồn/căn cứ: {target.source}</p>
    {review ? <p className="mt-2 rounded-lg bg-blue-50 p-2">Giáo viên: {review.decision} · {review.effectiveText ?? "Đã bác bỏ"} · {review.reason}</p> : null}
    {feedback.length ? <p className="mt-2 text-amber-700">{feedback.length} phản hồi: {feedback.map((item) => reasons[item.reason]).join(", ")}</p> : null}
    <div className="mt-3 grid gap-2 md:grid-cols-2"><select className="rounded-lg border p-2" value={decision} onChange={(event) => setDecision(event.target.value as StudyAiReview["decision"])}><option value="CONFIRMED">Xác nhận</option><option value="EDITED">Sửa</option><option value="REJECTED">Bác bỏ</option></select><input className="rounded-lg border p-2" value={why} onChange={(event) => setWhy(event.target.value)} placeholder="Lý do bắt buộc" /></div>
    {decision === "EDITED" ? <textarea className="mt-2 w-full rounded-lg border p-2" value={edit} onChange={(event) => setEdit(event.target.value)} placeholder="Nội dung đúng sau khi sửa" /> : null}
    <Button size="sm" className="mt-2" disabled={busy || !why.trim() || (decision === "EDITED" && !edit.trim())} onClick={() => void onReview({ decision, reason: why, effectiveText: decision === "EDITED" ? edit : undefined, expectedVersion: review?.version ?? 0 })}>Lưu duyệt</Button>
    <div className="mt-3 flex flex-wrap gap-2"><select className="rounded-lg border p-2" value={flag} onChange={(event) => setFlag(event.target.value as StudyAiFeedback["reason"])}>{Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="min-w-40 flex-1 rounded-lg border p-2" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ghi chú phản hồi" /><Button size="sm" variant="outline" disabled={busy} onClick={() => void onFeedback({ reason: flag, comment })}>Gắn cờ</Button></div>
    {history.length ? <details className="mt-3"><summary className="cursor-pointer">Lịch sử duyệt ({history.length})</summary><ul className="mt-2 space-y-1">{history.map((item) => <li key={`${item.reviewId}-${item.version}`}>v{item.version} · {item.decision} · {item.reason}</li>)}</ul></details> : null}
  </details>;
}

const localInputTime = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

function TeacherPlan({ plan, studentName, busy, run, onChanged }: { plan: LearningPlan; studentName: string; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void>; onChanged: () => Promise<void> }) {
  const [reason, setReason] = useState(""); const [title, setTitle] = useState(plan.title);
  const [showImprovement, setShowImprovement] = useState(false);
  const [due, setDue] = useState(localInputTime(plan.dueAt));
  const [target, setTarget] = useState<number | "">(plan.targetAccuracyPercent ?? "");
  useEffect(() => { setTitle(plan.title); setDue(localInputTime(plan.dueAt)); setTarget(plan.targetAccuracyPercent ?? ""); }, [plan.title, plan.dueAt, plan.targetAccuracyPercent, plan.version]);
  return <article className="rounded-xl border p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-bold">{studentName} · {plan.title} · {plan.objective?.title ?? plan.objectiveId}</h4><span>{plan.status}</span></div><p className="mt-1 text-slate-500">{plan.summary} · Tiêu chí: {plan.successCriteria} · Ngưỡng đã đặt: {plan.targetAccuracyPercent ?? "chưa có"}%</p><p className="mt-1 text-slate-500">Mốc ban đầu: {plan.baselineEvidenceId ?? "Chưa xác nhận"}</p>
    <ol className="mt-2 space-y-2">{plan.tasks.map((task) => <li key={task.id} className="rounded-lg bg-slate-50 p-2">{task.order}. {task.title} · {task.kind} · {task.progress?.status ?? task.status}{task.overdue ? " · Quá hạn" : ""}{task.dueAt ? ` · hạn ${new Date(task.dueAt).toLocaleString("vi-VN")}` : ""}{task.progress?.difficultyNote ? ` · Khó khăn: ${task.progress.difficultyNote}` : ""}<div className="mt-1 flex gap-2"><Button size="sm" variant="ghost" disabled={busy || task.status === "CANCELLED"} onClick={() => { const next = window.prompt("Tên nhiệm vụ mới", task.title); const why = next?.trim() ? window.prompt("Lý do sửa nhiệm vụ") : null; if (next?.trim() && why?.trim()) void run(() => learningPlanService.updateTask(task.id, { expectedVersion: task.version, reason: why.trim(), title: next.trim() }), "Đã sửa nhiệm vụ"); }}>Sửa</Button><Button size="sm" variant="ghost" disabled={busy || task.status === "CANCELLED"} onClick={() => { const next = window.prompt("Hạn mới (ISO hoặc YYYY-MM-DDTHH:mm)", task.dueAt ?? ""); const why = next?.trim() ? window.prompt("Lý do đổi hạn") : null; if (next?.trim() && why?.trim() && !Number.isNaN(new Date(next).getTime())) void run(() => learningPlanService.updateTask(task.id, { expectedVersion: task.version, reason: why.trim(), dueAt: new Date(next).toISOString() }), "Đã đổi hạn nhiệm vụ"); }}>Đổi hạn</Button><Button size="sm" variant="ghost" disabled={busy || task.status === "CANCELLED"} onClick={() => { const why = window.prompt("Lý do hủy nhiệm vụ"); if (why?.trim()) void run(() => learningPlanService.updateTask(task.id, { expectedVersion: task.version, reason: why.trim(), status: "CANCELLED" }), "Đã hủy nhiệm vụ"); }}>Hủy nhiệm vụ</Button></div></li>)}</ol>
    <div className="mt-3 flex flex-wrap gap-2"><input className="rounded-lg border p-2" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Tên lộ trình mới" /><input type="datetime-local" className="rounded-lg border p-2" value={due} onChange={(event) => setDue(event.target.value)} aria-label="Hạn lộ trình" />{plan.status === "DRAFT" ? <input type="number" min="0" max="100" className="w-28 rounded-lg border p-2" value={target} onChange={(event) => setTarget(event.target.value === "" ? "" : Number(event.target.value))} aria-label="Ngưỡng đúng phần trăm" /> : null}<input className="rounded-lg border p-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do điều chỉnh / hủy" /><Button size="sm" variant="outline" disabled={busy || !reason.trim() || !title.trim() || (plan.status === "DRAFT" && (target === "" || target < 0 || target > 100))} onClick={() => void run(() => learningPlanService.updatePlan(plan.id, { expectedVersion: plan.version, reason, title, targetAccuracyPercent: target === "" ? undefined : target, dueAt: due ? new Date(due).toISOString() : undefined }), "Đã sửa lộ trình")}>Sửa lộ trình</Button>{plan.status === "DRAFT" ? <Button size="sm" disabled={busy || plan.targetAccuracyPercent === null} onClick={() => void run(() => learningPlanService.publish(plan.id, plan.version), "Đã giao lộ trình cho học sinh")}>Duyệt và giao</Button> : null}{plan.status !== "CANCELLED" ? <Button size="sm" variant="outline" disabled={busy || !reason.trim()} onClick={() => void run(() => learningPlanService.cancel(plan.id, plan.version, reason), "Đã hủy lộ trình")}>Hủy lộ trình</Button> : null}</div>
    {plan.history.length ? <details className="mt-2 text-slate-500"><summary className="cursor-pointer">Lịch sử ({plan.history.length})</summary>{plan.history.map((item) => <p key={item.id}>v{item.version} · {item.reason}</p>)}</details> : null}
    {plan.status !== "DRAFT" ? <><Button className="mt-3" size="sm" variant="outline" onClick={() => setShowImprovement((value) => !value)}>{showImprovement ? "Đóng đánh giá cải thiện" : "Đánh giá cải thiện / xem hai bài nguồn"}</Button>{showImprovement ? <TeacherImprovementPanel planId={plan.id} onChanged={onChanged} /> : null}</> : null}
  </article>;
}
