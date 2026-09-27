"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AssessmentShell, ErrorPanel } from "@/components/assessment/assessment-shell";
import { TeacherImprovementPanel } from "@/components/assessment/learning-improvement-panel";
import { learningPlanService } from "@/lib/assessment-api";
import type { LearningPlan } from "@/types/assessment";

export function TeacherLearningPlanPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [error, setError] = useState("");
  async function reload() { setPlan(await learningPlanService.getTeacher(id)); }
  useEffect(() => { let live = true; void learningPlanService.getTeacher(id).then((value) => { if (live) setPlan(value); }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Không thể tải lộ trình"); }); return () => { live = false; }; }, [id]);
  return <AssessmentShell><div className="mx-auto max-w-4xl space-y-4"><Link href={plan ? `/teacher/exams/${plan.examId}/submissions` : "/teacher/exams"} className="text-sm text-brand-700 underline">Quay lại lớp</Link>{error ? <ErrorPanel message={error} /> : null}{!plan ? <p>Đang tải lộ trình...</p> : <section className="rounded-xl border bg-white p-5"><h1 className="text-2xl font-black">{plan.title}</h1><p className="mt-2">{plan.objective?.title} · {plan.status} · ngưỡng {plan.targetAccuracyPercent ?? "chưa có"}%</p><p className="mt-1 text-sm text-slate-600">{plan.summary}</p><TeacherImprovementPanel planId={plan.id} onChanged={reload} /></section>}</div></AssessmentShell>;
}
