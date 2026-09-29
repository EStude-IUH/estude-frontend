"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { examAttemptService } from "@/lib/assessment-api";
import type {
  StudyPracticeAttemptResult,
  StudyPracticeAttemptSummary,
} from "@/types/assessment";

export const assistanceLabel = (value: string) =>
  value === "SYSTEM_HINTS_USED"
    ? "Có dùng gợi ý hệ thống"
    : value === "NO_SYSTEM_HINTS"
      ? "Không dùng gợi ý hệ thống"
      : "Chưa rõ điều kiện hỗ trợ";

export function PracticeAttemptHistory({
  practiceSetId,
  items,
}: {
  practiceSetId: string;
  items: StudyPracticeAttemptSummary[];
}) {
  const [selected, setSelected] = useState<StudyPracticeAttemptResult | null>(
    null,
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function open(id: string) {
    setLoading(id);
    setError("");
    try {
      setSelected(
        await examAttemptService.getStudyPracticeAttempt(practiceSetId, id),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải lượt ôn tập",
      );
    } finally {
      setLoading(null);
    }
  }
  return (
    <section
      className="mb-6 rounded-xl border border-slate-200 p-4"
      aria-label="Lịch sử lượt ôn tập"
    >
      <h3 className="font-black">Lịch sử ôn tập</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Mỗi lượt giữ riêng kết quả và nội dung câu hỏi. Kết quả luyện trên cùng
        bộ câu chưa đủ để kết luận đã cải thiện kiến thức.
      </p>
      {items.some((item) => item.legacy) ? (
        <p className="mt-2 text-xs text-amber-700">
          Dữ liệu cũ chỉ còn lượt được lưu trước cập nhật; các lượt từng bị ghi
          đè không có trong lịch sử.
        </p>
      ) : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[580px] text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2">Lượt</th>
              <th>Thời điểm nộp</th>
              <th>Kết quả</th>
              <th>Hỗ trợ</th>
              <th>Xem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-3 font-bold">
                  {item.attemptNumber}
                  {item.legacy ? " (cũ)" : ""}
                </td>
                <td>
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleString("vi-VN")
                    : "Chưa nộp"}
                </td>
                <td>
                  {item.status === "SUBMITTED"
                    ? `${item.correctCount ?? "—"}/${item.totalQuestions} câu đúng`
                    : "Đang chuẩn bị / luyện"}
                </td>
                <td className="text-xs">{assistanceLabel(item.assistance)}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={item.status !== "SUBMITTED" || loading !== null}
                    onClick={() => void open(item.id)}
                    aria-label={`Xem lượt ôn tập ${item.attemptNumber}`}
                  >
                    {loading === item.id ? "Đang tải..." : "Bài làm"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      <Modal
        open={selected !== null}
        title={`Lượt ôn tập ${selected?.attemptNumber ?? ""}`}
        onClose={() => setSelected(null)}
        width="max-w-3xl"
      >
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {assistanceLabel(selected.assistance)} · {selected.correctCount}/
              {selected.totalQuestions} câu đúng
            </p>
            {selected.questions.map((q, index) => (
              <article
                key={q.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="font-bold">
                  Câu {index + 1}: {q.content}
                </p>
                <p
                  className={`mt-1 text-sm ${q.correct ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {q.correct ? "Đúng" : "Chưa đúng"}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.options.map((o) => (
                    <li
                      key={o.id}
                      className={
                        q.correctOptionIds?.includes(o.id)
                          ? "text-emerald-700"
                          : "text-slate-600"
                      }
                    >
                      {o.label}. {o.text}
                      {q.selectedOptionIds?.includes(o.id) ? " · Đã chọn" : ""}
                      {q.correctOptionIds?.includes(o.id)
                        ? " · Đáp án đúng"
                        : ""}
                    </li>
                  ))}
                </ul>
                {q.explanation ? (
                  <p className="mt-2 text-sm text-slate-500">{q.explanation}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
