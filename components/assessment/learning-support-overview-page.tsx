"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, RefreshCw, Search } from "lucide-react";
import { AssessmentShell } from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import {
  ContentLoading,
  ContentLoadingOverlay,
} from "@/components/ui/content-loading";
import { usePermissions } from "@/context/permissions-context";
import { examService } from "@/lib/assessment-api";
import {
  matchesSearchKeyword,
  normalizeSearchKeyword,
} from "@/lib/search-keyword";
import type { LearningSupportOverview } from "@/types/assessment";

export function LearningSupportOverviewPage() {
  const { can, loading: permissionsLoading } = usePermissions();
  const allowed = can("exams.submissions");
  const [overview, setOverview] = useState<LearningSupportOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (permissionsLoading || !allowed) return;
    let active = true;
    setLoading(true);
    setError("");
    void examService
      .getLearningSupportOverview(refresh > 0)
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải tổng quan học tập",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, permissionsLoading, refresh]);

  const classes = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        scopes: LearningSupportOverview["scopes"];
      }
    >();
    for (const scope of overview?.scopes ?? []) {
      if (
        !matchesSearchKeyword(
          normalizeSearchKeyword(
            scope.className,
            scope.classCode,
            scope.subjectName,
            scope.subjectCode,
          ),
          search,
        )
      )
        continue;
      const group = grouped.get(scope.classId) ?? {
        id: scope.classId,
        code: scope.classCode,
        name: scope.className,
        scopes: [],
      };
      group.scopes.push(scope);
      grouped.set(scope.classId, group);
    }
    return [...grouped.values()];
  }, [overview, search]);

  return (
    <AssessmentShell>
      <div className="relative space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Theo dõi học tập
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tổng quan các lớp và môn đang phụ trách. Tỷ lệ nguy cơ được tính
              từ bài kiểm tra đã có điểm đầy đủ.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loading || !allowed}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw className="size-4" /> Cập nhật
          </Button>
        </header>

        {!permissionsLoading && !allowed ? (
          <p className="rounded-xl bg-white p-5 text-sm text-slate-500">
            Bạn chưa có quyền xem theo dõi học tập.
          </p>
        ) : error && !overview ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </p>
        ) : loading && !overview ? (
          <ContentLoading label="Đang tổng hợp các lớp..." />
        ) : overview ? (
          <>
            {loading ? (
              <ContentLoadingOverlay label="Đang cập nhật các lớp..." />
            ) : null}
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              >
                {error}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Lớp đang dạy" value={overview.totals.classCount} />
              <Stat label="Môn theo dõi" value={overview.totals.scopeCount} />
              <Stat
                label="Lượt sinh viên cần hỗ trợ"
                value={`${overview.totals.atRiskStudentCount}/${overview.totals.evaluatedStudentCount}`}
              />
            </div>
            <label className="relative block rounded-xl border border-slate-200 bg-white p-3">
              <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm lớp hoặc môn học"
                aria-label="Tìm lớp hoặc môn học"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-400"
              />
            </label>
            {classes.length ? (
              <div className="space-y-4">
                {classes.map((schoolClass) => (
                  <section
                    key={schoolClass.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                      <div>
                        <h2 className="font-black text-slate-900">
                          {schoolClass.name}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {schoolClass.code} · {schoolClass.scopes.length} môn
                          đang dạy
                        </p>
                      </div>
                      <Link
                        className="text-sm font-semibold text-brand-700 hover:underline"
                        href={`/teacher/classes/${schoolClass.id}`}
                      >
                        Xem lớp
                      </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {schoolClass.scopes.map((scope) => (
                        <div
                          key={`${scope.classId}:${scope.subjectId}`}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
                        >
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900">
                              {scope.subjectName}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {scope.studentCount} sinh viên · {scope.examCount}{" "}
                              bài kiểm tra đã mở
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                              {scope.error ? (
                                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                                  {scope.error}
                                </span>
                              ) : null}
                              {scope.anchorExamId ? (
                                <>
                                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                                    Ưu tiên {scope.levelCounts.HIGH}
                                  </span>
                                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                                    Theo dõi {scope.levelCounts.WATCH}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                    Thiếu dữ liệu{" "}
                                    {scope.levelCounts.INSUFFICIENT}
                                  </span>
                                  {scope.materialContext?.available ===
                                  false ? (
                                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
                                      Chưa có tài liệu
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                  Chưa có bài kiểm tra đã công bố
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-slate-500">
                                Nguy cơ từ bài kiểm tra
                              </p>
                              <p className="text-lg font-black text-slate-900">
                                {scope.riskSummary?.atRiskPercentage == null
                                  ? "—"
                                  : `${scope.riskSummary.atRiskPercentage}%`}
                              </p>
                              <p className="text-xs text-slate-400">
                                {scope.riskSummary
                                  ? `${scope.riskSummary.atRiskStudentCount}/${scope.riskSummary.evaluatedStudentCount} có đủ dữ liệu`
                                  : "Chưa đủ dữ liệu"}
                              </p>
                            </div>
                            {scope.anchorExamId ? (
                              <Link
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                                href={`/teacher/learning-support/${scope.classId}/${scope.subjectId}`}
                              >
                                Mở môn <ArrowRight className="size-4" />
                              </Link>
                            ) : (
                              <Link
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                href="/teacher/exams"
                              >
                                <BookOpen className="size-4" /> Bài kiểm tra
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                {overview.scopes.length
                  ? "Không tìm thấy lớp hoặc môn phù hợp."
                  : "Bạn chưa được phân công dạy môn nào."}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Số sinh viên cần hỗ trợ được cộng theo từng môn/lớp; một sinh viên
              học nhiều môn có thể xuất hiện nhiều lần.
            </p>
          </>
        ) : null}
      </div>
    </AssessmentShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
