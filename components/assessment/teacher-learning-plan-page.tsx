"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Send,
  Target,
} from "lucide-react";
import {
  AssessmentShell,
  ErrorPanel,
  LoadingPanel,
} from "@/components/assessment/assessment-shell";
import { TeacherImprovementPanel } from "@/components/assessment/learning-improvement-panel";
import { Button } from "@/components/ui/button";
import { learningPlanService } from "@/lib/assessment-api";
import type { LearningPlan, LearningTask } from "@/types/assessment";

const statusText: Record<LearningPlan["status"], string> = {
  DRAFT: "Bản nháp",
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang học",
  WAITING_REASSESSMENT: "Chờ đánh giá lại",
  ACHIEVED: "Đạt mục tiêu",
  NEEDS_ADJUSTMENT: "Cần điều chỉnh",
  CANCELLED: "Đã hủy",
};

const progressText: Record<
  NonNullable<LearningTask["progress"]>["status"],
  string
> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

const evaluationStatuses = new Set<LearningPlan["status"]>([
  "WAITING_REASSESSMENT",
  "ACHIEVED",
  "NEEDS_ADJUSTMENT",
]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function taskState(task: LearningTask) {
  if (task.progress) return progressText[task.progress.status];
  if (task.status === "DRAFT") return "Chưa giao";
  if (task.status === "CANCELLED") return "Đã hủy";
  return "Chưa bắt đầu";
}

export function TeacherLearningPlanPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    const value = await learningPlanService.getTeacher(id);
    setPlan(value);
  }, [id]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    learningPlanService
      .getTeacher(id)
      .then((value) => {
        if (live) setPlan(value);
      })
      .catch((cause) => {
        if (live)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải lộ trình",
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id]);

  async function publishPlan() {
    if (!plan || plan.status !== "DRAFT") return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const published = await learningPlanService.publish(
        plan.id,
        plan.version,
      );
      setPlan(published);
      setNotice("Đã duyệt và giao lộ trình cho học sinh.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể duyệt và giao lộ trình",
      );
    } finally {
      setBusy(false);
    }
  }

  const backHref = plan
    ? `/teacher/learning-support/${plan.classId}/${plan.subjectId}`
    : "/teacher/learning-support";

  return (
    <AssessmentShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <ArrowLeft className="size-4" />
          Quay lại theo dõi học tập
        </Link>

        {error ? <ErrorPanel message={error} /> : null}
        {notice ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            {notice}
          </div>
        ) : null}
        {loading ? <LoadingPanel /> : null}

        {!loading && plan ? (
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-brand-600">
                    Lộ trình học cá nhân
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                    {plan.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {plan.summary}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-brand-700">
                  {statusText[plan.status]}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    <Target className="size-4 text-brand-600" /> Mục tiêu
                  </div>
                  <p className="mt-2 font-bold text-slate-900">
                    {plan.objective?.title ?? plan.objectiveId}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    <CheckCircle2 className="size-4 text-brand-600" /> Ngưỡng
                    đạt
                  </div>
                  <p className="mt-2 font-bold text-slate-900">
                    {plan.targetAccuracyPercent !== null
                      ? `${plan.targetAccuracyPercent}%`
                      : "Chưa đặt"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    <CalendarDays className="size-4 text-brand-600" /> Hạn hoàn
                    thành
                  </div>
                  <p className="mt-2 font-bold text-slate-900">
                    {plan.dueAt ? formatDate(plan.dueAt) : "Không có hạn"}
                  </p>
                </div>
              </div>
            </header>

            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-brand-600" />
                  <h2 className="text-lg font-black text-slate-950">
                    Nội dung học sinh cần hoàn thành
                  </h2>
                </div>
                <ol className="mt-4 space-y-3">
                  {plan.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-black text-brand-700">
                            {task.order}
                          </span>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-brand-600">
                              {task.kind === "MATERIAL"
                                ? "Đọc tài liệu"
                                : "Làm bài luyện"}
                            </p>
                            <h3 className="mt-0.5 font-bold text-slate-900">
                              {task.title}
                            </h3>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {taskState(task)}
                          {task.overdue ? " · Quá hạn" : ""}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {task.description}
                      </p>
                      {task.dueAt ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Hạn: {formatDate(task.dueAt)}
                        </p>
                      ) : null}
                      {task.progress?.difficultyNote ? (
                        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                          Khó khăn học sinh đã báo:{" "}
                          {task.progress.difficultyNote}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
                {!plan.tasks.length ? (
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Lộ trình chưa có bước học nào.
                  </p>
                ) : null}
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  <div>
                    <h2 className="font-black text-slate-900">
                      Điều kiện hoàn thành
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {plan.successCriteria}
                    </p>
                  </div>
                </div>
              </section>

              {plan.status === "DRAFT" ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-bold text-amber-900">
                    Lộ trình này đang là bản nháp và học sinh chưa nhìn thấy.
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Kiểm tra các bước học và điều kiện hoàn thành, sau đó duyệt
                    để giao cho học sinh.
                  </p>
                  <Button
                    className="mt-4"
                    disabled={busy}
                    onClick={() => void publishPlan()}
                  >
                    <Send className="size-4" />
                    {busy ? "Đang giao..." : "Duyệt và giao cho học sinh"}
                  </Button>
                </section>
              ) : null}

              {plan.status === "ASSIGNED" || plan.status === "IN_PROGRESS" ? (
                <section className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Học sinh đang thực hiện các bước phía trên. Phần đánh giá sau
                  lộ trình sẽ mở khi học sinh hoàn thành nhiệm vụ.
                </section>
              ) : null}

              {evaluationStatuses.has(plan.status) ? (
                <TeacherImprovementPanel planId={plan.id} onChanged={reload} />
              ) : null}
            </div>
          </article>
        ) : null}
      </div>
    </AssessmentShell>
  );
}
