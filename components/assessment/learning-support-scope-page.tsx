"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AssessmentShell } from "@/components/assessment/assessment-shell";
import { SubjectSupportDetail } from "@/components/assessment/subject-support-page";
import { examService } from "@/lib/assessment-api";
import type { LearningSupportOverview } from "@/types/assessment";

export function LearningSupportScopePage() {
  const { classId, subjectId } = useParams<{
    classId: string;
    subjectId: string;
  }>();
  const [scope, setScope] = useState<
    LearningSupportOverview["scopes"][number] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void examService
      .getLearningSupportOverview()
      .then((overview) => {
        if (!active) return;
        setScope(
          overview.scopes.find(
            (item) => item.classId === classId && item.subjectId === subjectId,
          ) ?? null,
        );
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải môn học",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, subjectId]);

  if (scope?.anchorExamId)
    return <SubjectSupportDetail examId={scope.anchorExamId} />;
  return (
    <AssessmentShell>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <Link
          href="/teacher/learning-support"
          className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <ArrowLeft className="size-4" /> Tất cả lớp và môn
        </Link>
        <p className="mt-4 text-slate-600">
          {loading
            ? "Đang tải môn học..."
            : error ||
              (scope
                ? "Môn này chưa có bài kiểm tra đã công bố để đánh giá nguy cơ."
                : "Không tìm thấy lớp/môn trong phạm vi được phân công.")}
        </p>
      </div>
    </AssessmentShell>
  );
}
