"use client";

import { BrainCircuit, LoaderCircle, Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useActionNotification } from "@/components/ui/action-notification";
import { aiQuestionSettingsService } from "@/lib/assessment-api";
import type { Difficulty, DifficultyLevelDefinition } from "@/types/assessment";

const builtInLevels: DifficultyLevelDefinition[] = [
  { code: "EASY", label: "Dễ", description: "Kiểm tra khả năng ghi nhớ, nhận biết và hiểu trực tiếp kiến thức trong tài liệu." },
  { code: "MEDIUM", label: "Trung bình", description: "Yêu cầu áp dụng kiến thức hoặc liên kết hai ý có liên quan trong tài liệu." },
  { code: "HARD", label: "Khó", description: "Yêu cầu phân tích, so sánh hoặc suy luận từ nhiều thông tin trong tài liệu." },
  { code: "VERY_HARD", label: "Rất khó", description: "Yêu cầu tổng hợp nhiều phần, đánh giá tình huống và tránh các phương án nhiễu tinh vi." },
];

export function AiDifficultySettingsPanel() {
  const { notify } = useActionNotification();
  const [levels, setLevels] = useState<DifficultyLevelDefinition[]>(builtInLevels.slice(0, 3));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    aiQuestionSettingsService.getSystem()
      .then((result) => setLevels(result.levels))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải cấu hình độ khó"))
      .finally(() => setLoading(false));
  }, []);

  function changeLevelCount(count: 3 | 4) {
    setLevels((current) => count === 3
      ? current.filter((item) => item.code !== "VERY_HARD")
      : builtInLevels.map((fallback) => current.find((item) => item.code === fallback.code) ?? fallback));
  }

  function updateLevel(code: Difficulty, patch: Partial<DifficultyLevelDefinition>) {
    setLevels((current) => current.map((item) => item.code === code ? { ...item, ...patch } : item));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const result = await aiQuestionSettingsService.updateSystem(levels);
      setLevels(result.levels);
      notify("Đã lưu bộ độ khó mặc định cho câu hỏi AI", { key: "ai-difficulty-system-saved" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu cấu hình độ khó");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full pb-8">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-600">Admin workspace</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Độ khó câu hỏi AI</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Thiết lập 3 hoặc 4 mức mặc định. Giáo viên có thể ghi đè từng tên/mô tả; ô để trống sẽ kế thừa cấu hình này.</p>
        </div>
        <Button onClick={() => void save()} disabled={saving || loading} className="w-fit !rounded-lg">
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><BrainCircuit className="size-5" /></span>
          <div><h2 className="font-extrabold text-slate-950">Bộ phân loại mặc định</h2><p className="mt-1 text-sm text-slate-500">Mô tả càng rõ thì Gemini phân hóa câu hỏi càng chính xác.</p></div>
        </div>
        {error ? <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><SlidersHorizontal className="size-4" />Số mức độ</span>
          <div className="flex gap-2">{([3, 4] as const).map((count) => <button key={count} type="button" onClick={() => changeLevelCount(count)} className={`rounded-lg px-4 py-2 text-xs font-black ${levels.length === count ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{count} mức</button>)}</div>
        </div>
        {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-600" /></div> : <div className="mt-5 grid gap-4">{levels.map((level, index) => <div key={level.code} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[190px_minmax(0,1fr)]"><label className="grid content-start gap-2 text-sm font-bold text-slate-700">Mức {index + 1}<input value={level.label} onChange={(event) => updateLevel(level.code, { label: event.target.value })} maxLength={60} className="h-11 rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-brand-500" /></label><label className="grid gap-2 text-sm font-bold text-slate-700">Tiêu chí phân loại<textarea value={level.description} onChange={(event) => updateLevel(level.code, { description: event.target.value })} maxLength={600} rows={3} className="rounded-xl border border-slate-200 p-3 font-normal leading-6 outline-none focus:border-brand-500" /></label></div>)}</div>}
      </section>
    </div>
  );
}
