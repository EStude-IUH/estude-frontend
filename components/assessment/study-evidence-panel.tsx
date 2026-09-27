"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { examService } from "@/lib/assessment-api";
import { ApiError } from "@/lib/auth-api";
import type { AssessmentEvidenceRecord, StudyEvidenceBundle } from "@/types/assessment";

const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

function EvidenceQuestions({ evidence }: { evidence: AssessmentEvidenceRecord }) {
  return (
    <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-bold text-brand-700">Xem câu hỏi và đáp án nguồn</summary>
      <div className="mt-3 space-y-3">
        {evidence.questionSnapshot.map((question, index) => {
          const answer = evidence.answers.find((item) => item.questionId === question.questionId);
          return (
            <div key={question.questionId} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-bold">Câu {index + 1}: {question.content}</p>
              <p className="mt-1 text-xs text-slate-500">{question.difficulty} · {question.points} điểm</p>
              {question.imageUrl ? <a href={question.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-brand-700 underline">Mở ảnh câu hỏi</a> : null}
              {question.type === "ESSAY" ? (
                <p className="mt-2 whitespace-pre-wrap">Bài làm: {answer?.essayText || "Bỏ trống"} · Chưa chấm tự động</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {question.options.map((option) => {
                    const chosen = answer?.selectedOptionIds.includes(option.id);
                    const correct = question.correctOptionIds.includes(option.id);
                    return <p key={option.id} className={correct ? "text-emerald-700" : chosen ? "text-rose-700" : "text-slate-600"}>
                      {option.label}. {option.text}{chosen ? " · học sinh chọn" : ""}{correct ? " · đáp án đúng" : ""}
                    </p>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function StudyEvidencePanel({ examId, studentId }: { examId: string; studentId: string }) {
  const [bundle, setBundle] = useState<StudyEvidenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setBundle(null);
    setCandidateId(null);
    void examService.getStudentEvidence(examId, studentId)
      .then((value) => { if (active) setBundle(value); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải bằng chứng"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId, studentId]);

  const groups = useMemo(() => {
    const grouped = new Map<string, AssessmentEvidenceRecord[]>();
    for (const item of bundle?.items ?? []) grouped.set(item.objectiveId, [...(grouped.get(item.objectiveId) ?? []), item]);
    return [...grouped.entries()];
  }, [bundle]);

  async function saveBaseline(evidence: AssessmentEvidenceRecord) {
    if (!bundle || !reason.trim()) return;
    setSaving(true);
    setError("");
    try {
      const current = bundle.baselines.find((item) => item.objectiveId === evidence.objectiveId);
      await examService.selectStudentBaseline(examId, studentId, {
        evidenceId: evidence.id,
        reason: reason.trim(),
        expectedVersion: current?.version ?? 0,
      });
      setBundle(await examService.getStudentEvidence(examId, studentId));
      setCandidateId(null);
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xác nhận mốc ban đầu");
      if (cause instanceof ApiError && cause.status === 409) {
        try { setBundle(await examService.getStudentEvidence(examId, studentId)); } catch { /* Keep the conflict visible. */ }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-black text-slate-900">Bằng chứng và mốc ban đầu</h2>
      <p className="mt-1 text-sm text-slate-500">Kết quả được nhóm theo mã mục tiêu; mốc chỉ thay đổi khi giáo viên xác nhận.</p>
      {loading ? <p className="mt-4 text-sm text-slate-500">Đang tải bằng chứng...</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      {bundle?.missingSnapshotAttemptIds.length ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{bundle.missingSnapshotAttemptIds.length} lượt kiểm tra cũ thiếu snapshot hợp lệ nên chưa thể đối chiếu câu hỏi.</p>
      ) : null}
      {!loading && bundle && !groups.length ? <p className="mt-4 text-sm text-slate-500">Chưa có bài nộp với snapshot hợp lệ trong phạm vi lớp và môn này.</p> : null}
      <div className="mt-4 space-y-5">
        {groups.map(([objectiveId, items]) => {
          const baseline = bundle?.baselines.find((item) => item.objectiveId === objectiveId);
          const history = bundle?.baselineHistory.filter((item) => item.selectionId === baseline?.id) ?? [];
          return (
            <div key={objectiveId} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-black">{items[0].objective?.title || "Mục tiêu chưa có tên"}</h3>
              <p className="mt-1 break-all text-xs text-slate-500">Mã mục tiêu: {items[0].objective?.key ?? objectiveId}</p>
              {baseline ? <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">Mốc đã xác nhận: phiên bản {baseline.version} · {formatDate(baseline.selectedAt)} · {baseline.reason}</p> : <p className="mt-2 text-sm text-amber-700">Chưa chọn mốc ban đầu.</p>}
              <div className="mt-3 space-y-3">
                {items.map((evidence) => (
                  <article key={evidence.id} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{evidence.source === "ASSIGNED_EXAM" ? "Bài kiểm tra được giao" : "Luyện tập"} · {evidence.sourceTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(evidence.observedAt)} · {evidence.correctCount}/{evidence.scorableCount} câu có thể chấm đúng{evidence.accuracy === null ? "" : ` · ${evidence.accuracy}%`} · {evidence.gradingStatus === "COMPLETE" ? "Đã chấm đủ" : "Chưa chấm đủ"}</p>
                        <p className="mt-1 text-xs text-slate-500">{evidence.assistance === "SYSTEM_HINTS_USED" ? "Có dùng gợi ý" : evidence.assistance === "NO_SYSTEM_HINTS" ? "Không dùng gợi ý hệ thống" : "Chưa rõ hỗ trợ"} · Quy tắc chấm: {evidence.gradingVersion}</p>
                      </div>
                      {baseline?.evidenceId === evidence.id ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">Mốc hiện tại</span> : null}
                    </div>
                    {evidence.source === "ASSIGNED_EXAM" ? <Link href={`/teacher/exams/${evidence.examId}/submissions/${evidence.sourceAttemptId}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">Mở bài nộp</Link> : null}
                    <EvidenceQuestions evidence={evidence} />
                    {evidence.baselineEligible ? (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => { setCandidateId(candidateId === evidence.id ? null : evidence.id); setReason(""); }}>Chọn làm mốc ban đầu</Button>
                        {candidateId === evidence.id ? (
                          <div className="mt-3 space-y-2">
                            <label htmlFor={`baseline-reason-${evidence.id}`} className="block text-sm font-semibold">Lý do chọn mốc</label>
                            <textarea id={`baseline-reason-${evidence.id}`} className="min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm" value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} />
                            <Button size="sm" disabled={saving || !reason.trim()} onClick={() => void saveBaseline(evidence)}>{saving ? "Đang lưu..." : "Xác nhận mốc"}</Button>
                          </div>
                        ) : null}
                      </div>
                    ) : <p className="mt-3 text-xs text-amber-700">Không thể chọn làm mốc: {evidence.ineligibleReason}</p>}
                  </article>
                ))}
              </div>
              {history.length ? <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Lịch sử chọn mốc ({history.length})</summary><ul className="mt-2 space-y-1">{history.map((item) => <li key={`${item.selectionId}-${item.version}`}>Phiên bản {item.version} · {formatDate(item.selectedAt)} · {item.reason}</li>)}</ul></details> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
