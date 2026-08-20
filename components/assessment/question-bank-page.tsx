"use client";

import Link from "next/link";
import { Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AssessmentShell, ErrorPanel, LoadingPanel, PageHeading } from "@/components/assessment/assessment-shell";
import { Button } from "@/components/ui/button";
import { questionBankService } from "@/lib/assessment-api";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, type Difficulty, type Question, type QuestionType } from "@/types/assessment";

const difficultyTone: Record<Difficulty, string> = { EASY: "bg-emerald-50 text-emerald-700", MEDIUM: "bg-amber-50 text-amber-700", HARD: "bg-rose-50 text-rose-700" };

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [type, setType] = useState<QuestionType | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setQuestions(await questionBankService.getQuestions({ search: search || undefined, difficulty: difficulty || undefined, type: type || undefined })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải ngân hàng câu hỏi"); }
    finally { setLoading(false); }
  }
  // The filter values intentionally control this server refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [difficulty, type]);

  async function remove(question: Question) {
    if (!window.confirm(`Xóa câu hỏi “${question.content.slice(0, 45)}...” khỏi ngân hàng?`)) return;
    try { await questionBankService.deleteQuestion(question.id); setQuestions((items) => items.filter((item) => item.id !== question.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xóa câu hỏi"); }
  }

  return <AssessmentShell><PageHeading eyebrow="Teacher workspace" title="Ngân hàng câu hỏi" description="Quản lý câu hỏi dùng chung cho các bài kiểm tra. Dữ liệu được lưu trực tiếp trên Backend." action={<Link href="/teacher/question-bank/new"><Button>+ Tạo câu hỏi</Button></Link>} />
    <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_180px_190px_auto]">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} placeholder="Tìm theo nội dung câu hỏi..." className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50" /></div>
      <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "")} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-500"><option value="">Mọi độ khó</option><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select>
      <select value={type} onChange={(event) => setType(event.target.value as QuestionType | "")} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-500"><option value="">Mọi loại câu hỏi</option>{Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <Button variant="secondary" onClick={() => void load()}>Lọc dữ liệu</Button>
    </div>
    {error ? <div className="mb-5"><ErrorPanel message={error} /></div> : null}
    {loading ? <LoadingPanel /> : questions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"><p className="font-bold text-slate-700">Chưa có câu hỏi phù hợp</p><p className="mt-1 text-sm text-slate-500">Tạo câu hỏi đầu tiên để dùng khi lập đề.</p></div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"><div className="hidden grid-cols-[minmax(0,1fr)_170px_130px_130px_100px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400 md:grid"><span>Nội dung</span><span>Môn / chủ đề</span><span>Loại</span><span>Độ khó</span><span /></div>{questions.map((question) => <article key={question.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_170px_130px_130px_100px] md:items-center md:gap-4"><div><p className="font-bold leading-6 text-slate-900">{question.content}</p><p className="mt-1 text-xs text-slate-500">{question.options.length} lựa chọn · {question.defaultPoints} điểm</p></div><div className="text-sm"><p className="font-semibold text-slate-700">{question.subjectName}</p><p className="mt-1 text-xs text-slate-400">{question.topicName}</p></div><span className="w-fit rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{QUESTION_TYPE_LABELS[question.type]}</span><span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${difficultyTone[question.difficulty]}`}>{DIFFICULTY_LABELS[question.difficulty]}</span><div className="flex gap-1 md:justify-end"><Link href={`/teacher/question-bank/${question.id}/edit`} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-brand-700" aria-label="Sửa"><Pencil className="size-4" /></Link><button type="button" onClick={() => void remove(question)} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Xóa"><Trash2 className="size-4" /></button></div></article>)}</div>}
  </AssessmentShell>;
}
