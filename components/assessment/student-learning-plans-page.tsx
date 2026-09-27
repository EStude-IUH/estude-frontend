"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { learningPlanService } from "@/lib/assessment-api";
import { StudentImprovementPanel } from "@/components/assessment/student-improvement-panel";
import type { LearningPlan } from "@/types/assessment";

const statusText: Record<LearningPlan["status"], string> = {
  DRAFT: "Bản nháp", ASSIGNED: "Đã giao", IN_PROGRESS: "Đang học",
  WAITING_REASSESSMENT: "Chờ đánh giá lại", ACHIEVED: "Đạt mục tiêu", NEEDS_ADJUSTMENT: "Cần điều chỉnh", CANCELLED: "Đã hủy",
};

export function StudentLearningPlansPage({ detail = false }: { detail?: boolean }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});

  async function reload() {
    if (detail && params.id) setPlans([await learningPlanService.getMine(params.id)]);
    else setPlans(await learningPlanService.listMine());
  }
  useEffect(() => {
    let live = true;
    (detail && params.id ? learningPlanService.getMine(params.id).then((item) => [item]) : learningPlanService.listMine())
      .then((items) => { if (live) setPlans(items); })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Không thể tải lộ trình"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [detail, params.id]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật nhiệm vụ"); }
    finally { setBusy(false); }
  }

  return <StudentShell><div className="mx-auto max-w-4xl space-y-5">
    <div><Link href="/student/learning-plans" className="text-sm text-brand-700">Lộ trình đã giao</Link><h1 className="mt-2 text-2xl font-black">{detail ? "Chi tiết lộ trình" : "Lộ trình học của tôi"}</h1><p className="text-sm text-slate-500">Hoàn thành nhiệm vụ chưa đồng nghĩa đã đạt mục tiêu; giáo viên sẽ đánh giá lại bằng bằng chứng mới.</p></div>
    {loading ? <p>Đang tải...</p> : null}{error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
    {!loading && !plans.length ? <p className="rounded-xl bg-white p-5">Chưa có lộ trình được giao.</p> : null}
    {plans.map((plan) => {
      const next = plan.tasks.find((task) => task.status === "ASSIGNED" && task.progress?.status !== "COMPLETED");
      return <article key={plan.id} className="rounded-2xl border bg-white p-5 shadow-card">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-black">{plan.title}</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{statusText[plan.status]}</span></div>
        <p className="mt-2 text-sm text-slate-600">{plan.summary}</p><p className="mt-2 text-sm">Mục tiêu: <b>{plan.objective?.title ?? plan.objectiveId}</b></p><p className="text-sm">Tiêu chí đánh giá lại: {plan.successCriteria}</p>
        {plan.dueAt ? <p className="mt-1 text-xs text-slate-500">Hạn: {new Date(plan.dueAt).toLocaleString("vi-VN")}</p> : null}
        {next ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">Bước tiếp theo: {next.title}{next.overdue ? " · Quá hạn" : ""}</p> : null}
        {!detail ? <Link href={`/student/learning-plans/${plan.id}`} className="mt-3 inline-block text-sm font-bold text-brand-700 underline">Mở lộ trình</Link> : null}
        {detail ? <ol className="mt-5 space-y-3">{plan.tasks.map((task) => <li key={task.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{task.order}. {task.title}</h3><span className="text-sm">{task.progress?.status ?? task.status}{task.overdue ? " · Quá hạn" : ""}</span></div><p className="mt-1 text-sm text-slate-600">{task.description}</p>
          {task.kind === "PRACTICE" ? <p className="mt-1 text-xs text-slate-500">Bài luyện được đánh dấu hoàn thành khi nộp bài; không thể tự xác nhận.</p> : null}
          {task.progress?.difficultyNote ? <p className="mt-2 text-sm text-amber-700">Khó khăn đã báo: {task.progress.difficultyNote}</p> : null}
          {task.status === "ASSIGNED" && ["ASSIGNED", "IN_PROGRESS"].includes(plan.status) ? <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy || !task.actionUrl} onClick={() => void run(async () => { const result = await learningPlanService.startTask(plan.id, task.id); if (result.actionUrl?.startsWith("/student/")) router.push(result.actionUrl); })}>Mở đúng {task.kind === "MATERIAL" ? "tài liệu" : "bài luyện"}</Button>{task.kind === "MATERIAL" && task.progress?.status !== "COMPLETED" ? <Button size="sm" variant="outline" disabled={busy || task.progress?.status === "NOT_STARTED"} onClick={() => void run(() => learningPlanService.completeMaterial(plan.id, task.id))}>Đã đọc xong</Button> : null}</div> : null}
          {task.status === "ASSIGNED" ? <div className="mt-3 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border p-2 text-sm" value={note[task.id] ?? ""} onChange={(event) => setNote((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Báo khó khăn với giáo viên" /><Button size="sm" variant="outline" disabled={busy || !(note[task.id] ?? "").trim()} onClick={() => void run(() => learningPlanService.reportDifficulty(plan.id, task.id, note[task.id]))}>Gửi</Button></div> : null}
        </li>)}</ol> : null}
        {plan.status === "WAITING_REASSESSMENT" ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Đã hoàn tất các bước học. Hãy chờ bài đánh giá lại và nhận xét của giáo viên.</p> : null}
        {detail ? <StudentImprovementPanel planId={plan.id} /> : null}
      </article>;
    })}
  </div></StudentShell>;
}
