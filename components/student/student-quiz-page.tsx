"use client";

import { ArrowLeft, CheckCircle2, CircleHelp, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { Button } from "@/components/ui/button";
import { studyCoachService } from "@/lib/study-coach-api";
import type { StudyCoachQuizAnswer, StudyCoachQuizAttempt, StudyCoachQuizQuestion, StudyCoachQuizResult, StudyCoachQuizState, StudyCoachQuizSummary } from "@/types/study-coach";

const ATTEMPT_KEY = "estude:study-coach:quiz-attempt:v1";
interface PendingAnswer { questionId: string; selectedOptionIndexes: number[]; clientEventId: string }

const questionTypeLabels: Record<StudyCoachQuizQuestion["type"], string> = {
  SINGLE_CHOICE: "Lựa chọn một đáp án",
  MULTIPLE_CHOICE: "Lựa chọn nhiều đáp án",
  TRUE_FALSE: "Đúng hoặc sai",
};

export function StudentQuizPage() {
  const router = useRouter();
  const [documentId] = useState(() => typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("documentId") || undefined);
  const answerSubmittingRef = useRef(false);
  const quizSubmittingRef = useRef(false);
  const [quizzes, setQuizzes] = useState<StudyCoachQuizSummary[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<StudyCoachQuizSummary | null>(null);
  const [state, setState] = useState<StudyCoachQuizState | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selection, setSelection] = useState<number[]>([]);
  const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(null);
  const [pendingSubmitId, setPendingSubmitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const rememberAttempt = useCallback((attemptId: string | null) => {
    try { if (attemptId) localStorage.setItem(ATTEMPT_KEY, attemptId); else localStorage.removeItem(ATTEMPT_KEY); } catch { /* Server state is authoritative. */ }
  }, []);
  const applyState = useCallback((next: StudyCoachQuizState) => {
    setState(next); setSelection([]); setPendingAnswer(null); setPendingSubmitId(null);
    if (next.status === "IN_PROGRESS") setQuestionIndex(next.currentQuestionIndex);
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const list = await studyCoachService.getQuizzes(documentId); setQuizzes(list.items);
      let attemptId = "";
      try { attemptId = localStorage.getItem(ATTEMPT_KEY) ?? ""; } catch { attemptId = ""; }
      if (attemptId) {
        try {
          const restored = await studyCoachService.getQuizAttempt(attemptId);
          const matchingQuiz = list.items.find((quiz) => quiz.id === restored.examId);
          if (matchingQuiz && (!documentId || matchingQuiz.document.id === documentId)) { applyState(restored); setSelectedQuiz(matchingQuiz); return; }
        } catch { rememberAttempt(null); }
      }
      const active = list.items.find((quiz) => quiz.activeAttemptId);
      if (active?.activeAttemptId) {
        const restored = await studyCoachService.getQuizAttempt(active.activeAttemptId);
        setSelectedQuiz(active); applyState(restored); rememberAttempt(restored.attemptId);
      }
    } catch (cause) { setError(messageOf(cause, "Không thể tải Quiz Study Coach.")); }
    finally { setLoading(false); }
  }, [applyState, documentId, rememberAttempt]);
  useEffect(() => { void load(); }, [load]);

  async function startQuiz(quiz: StudyCoachQuizSummary) {
    if (quizSubmittingRef.current || !quiz.availableQuestionCount) return;
    quizSubmittingRef.current = true; setSubmitting(true); setError("");
    try {
      const started = await studyCoachService.startQuiz(quiz.id, createClientEventId("quiz-start"));
      setSelectedQuiz(quiz); applyState(started); rememberAttempt(started.attemptId);
    } catch (cause) { setError(messageOf(cause, "Không thể bắt đầu quiz.")); }
    finally { quizSubmittingRef.current = false; setSubmitting(false); }
  }

  const active = state?.status === "IN_PROGRESS" ? state : null;
  const current = active?.questions[questionIndex] ?? null;
  const answer = current ? active?.answers.find((item) => item.questionId === current.questionId) : undefined;
  function toggleOption(question: StudyCoachQuizQuestion, optionIndex: number) {
    if (answer || submitting) return;
    if (question.type === "MULTIPLE_CHOICE") setSelection((selected) => selected.includes(optionIndex) ? selected.filter((index) => index !== optionIndex) : [...selected, optionIndex]);
    else setSelection([optionIndex]);
    setError("");
  }
  async function submitAnswer(existing?: PendingAnswer) {
    if (!active || !current || answerSubmittingRef.current) return;
    const request = existing ?? { questionId: current.questionId, selectedOptionIndexes: selection, clientEventId: createClientEventId("quiz-answer") };
    if (!request.selectedOptionIndexes.length) { setError("Hãy chọn đáp án hoặc dùng Câu tiếp để bỏ qua."); return; }
    answerSubmittingRef.current = true; setSubmitting(true); setError(""); setPendingAnswer(request);
    try {
      const result = await studyCoachService.submitQuizAnswer(active.attemptId, request.questionId, request.selectedOptionIndexes, request.clientEventId);
      const nextAnswer: StudyCoachQuizAnswer = result;
      setState({ ...active, answeredCount: result.progress.answeredCount, unansweredCount: result.progress.totalQuestions - result.progress.answeredCount, questions: active.questions.map((question) => question.questionId === result.questionId ? { ...question, answerState: "ANSWERED" } : question), answers: [...active.answers.filter((item) => item.questionId !== result.questionId), nextAnswer] });
      setPendingAnswer(null);
    } catch (cause) { setError(messageOf(cause, "Không thể gửi câu trả lời.")); }
    finally { answerSubmittingRef.current = false; setSubmitting(false); }
  }
  async function finalize(existingEventId?: string) {
    if (!active || quizSubmittingRef.current) return;
    quizSubmittingRef.current = true; setSubmitting(true); setError("");
    const clientEventId = existingEventId ?? createClientEventId("quiz-submit"); setPendingSubmitId(clientEventId);
    try { const result = await studyCoachService.submitQuiz(active.attemptId, clientEventId); applyState(result); rememberAttempt(result.attemptId); }
    catch (cause) { setError(messageOf(cause, "Không thể nộp quiz.")); }
    finally { quizSubmittingRef.current = false; setSubmitting(false); }
  }
  function nextQuestion() { if (!active) return; setSelection([]); setError(""); setQuestionIndex((index) => Math.min(index + 1, active.questions.length - 1)); }
  function restart() { rememberAttempt(null); setState(null); setSelectedQuiz((currentQuiz) => currentQuiz ? { ...currentQuiz, activeAttemptId: null } : null); setSelection([]); setError(""); setPendingSubmitId(null); }
  const backHref = documentId ? `/student/study-coach/materials/${encodeURIComponent(documentId)}` : "/student/study-coach";

  return <StudentShell>
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><button type="button" onClick={() => router.push(backHref)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="size-4" /> {documentId ? "Quay lại tài liệu" : "Quay lại Study Coach"}</button><p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-brand-600">AI Study Coach</p><h1 className="mt-1 text-2xl font-black text-slate-950">Quiz lý thuyết</h1><p className="mt-1 text-sm text-slate-500">Câu trả lời được chấm tự động và cập nhật vào tiến độ theo từng khái niệm.</p></header>
    {loading ? <LoadingPanel /> : null}
    {!loading && error && !state && !selectedQuiz ? <StatePanel title="Không thể tải quiz" detail={error} action="Thử lại" onAction={() => void load()} /> : null}
    {!loading && !state && !selectedQuiz && !error ? <QuizList quizzes={quizzes} onSelect={setSelectedQuiz} /> : null}
    {!loading && !state && selectedQuiz ? <QuizStart quiz={selectedQuiz} submitting={submitting} error={error} onBack={() => { setSelectedQuiz(null); setError(""); }} onStart={() => void startQuiz(selectedQuiz)} /> : null}
    {active && current ? <div data-testid="quiz-question"><QuestionPanel attempt={active} question={current} index={questionIndex} selection={selection} answer={answer} submitting={submitting} error={error} pendingAnswer={pendingAnswer} pendingSubmitId={pendingSubmitId} onToggle={toggleOption} onSubmitAnswer={() => void submitAnswer()} onRetryAnswer={() => pendingAnswer && void submitAnswer(pendingAnswer)} onNext={nextQuestion} onPrevious={() => { setSelection([]); setQuestionIndex((index) => Math.max(0, index - 1)); }} onFinalize={() => void finalize()} onRetryFinalize={() => pendingSubmitId && void finalize(pendingSubmitId)} /></div> : null}
    {state?.status === "SUBMITTED" ? <div data-testid="quiz-result"><ResultPanel result={state} onRestart={restart} /></div> : null}
  </StudentShell>;
}

function QuizList({ quizzes, onSelect }: { quizzes: StudyCoachQuizSummary[]; onSelect: (quiz: StudyCoachQuizSummary) => void }) {
  if (!quizzes.length) return <StatePanel title="Chưa có quiz" detail="Hãy xử lý tài liệu Study Coach để tạo ngân hàng câu hỏi." />;
  return <section className="mt-5 space-y-4">{quizzes.map((quiz) => <button key={quiz.id} type="button" onClick={() => onSelect(quiz)} className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-card hover:border-brand-300"><p className="text-xs font-black uppercase tracking-wider text-brand-600">{quiz.subject.name || "Study Coach"}</p><h2 className="mt-1 text-lg font-black text-slate-950">{quiz.title}</h2><p className="mt-2 text-sm text-slate-500">{quiz.document.name} · {quiz.availableQuestionCount} câu hỏi</p>{quiz.activeAttemptId ? <span className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Tiếp tục bài đang làm</span> : null}</button>)}</section>;
}
function QuizStart({ quiz, submitting, error, onBack, onStart }: { quiz: StudyCoachQuizSummary; submitting: boolean; error: string; onBack: () => void; onStart: () => void }) {
  const actual = Math.min(quiz.availableQuestionCount, 30);
  return <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"><button type="button" onClick={onBack} className="text-sm font-bold text-slate-500">← Chọn tài liệu khác</button><h2 className="mt-5 text-2xl font-black text-slate-950">{quiz.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{quiz.description || quiz.document.name}</p><p className="mt-3 text-sm font-semibold text-slate-600">Bài luyện này gồm {actual} câu hỏi.</p>{error ? <ErrorBox message={error} /> : null}<Button className="mt-5 h-12" disabled={!actual || submitting} onClick={onStart}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <CircleHelp className="size-4" />} {quiz.activeAttemptId ? "Tiếp tục quiz" : "Bắt đầu quiz"}</Button></section>;
}
function QuestionPanel({ attempt, question, index, selection, answer, submitting, error, pendingAnswer, pendingSubmitId, onToggle, onSubmitAnswer, onRetryAnswer, onNext, onPrevious, onFinalize, onRetryFinalize }: { attempt: StudyCoachQuizAttempt; question: StudyCoachQuizQuestion; index: number; selection: number[]; answer?: StudyCoachQuizAnswer; submitting: boolean; error: string; pendingAnswer: PendingAnswer | null; pendingSubmitId: string | null; onToggle: (question: StudyCoachQuizQuestion, optionIndex: number) => void; onSubmitAnswer: () => void; onRetryAnswer: () => void; onNext: () => void; onPrevious: () => void; onFinalize: () => void; onRetryFinalize: () => void }) {
  const last = index === attempt.questions.length - 1;
  return <><section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"><div className="flex justify-between text-xs font-bold text-slate-500"><span>Câu {index + 1}/{attempt.totalQuestions}</span><span>{attempt.answeredCount} đã trả lời</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${((index + 1) / attempt.totalQuestions) * 100}%` }} /></div></section><article className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-black uppercase tracking-wider text-brand-600">{questionTypeLabels[question.type]}</p><h2 className="mt-4 text-xl font-black leading-8 text-slate-950">{question.content}</h2><div className="mt-6 grid gap-3">{question.options.map((option, optionIndex) => { const checked = answer ? answer.selectedOptionIndexes.includes(optionIndex) : selection.includes(optionIndex); return <button key={option.id} type="button" disabled={Boolean(answer) || submitting} aria-pressed={checked} onClick={() => onToggle(question, optionIndex)} className={`min-h-14 rounded-2xl border p-4 text-left ${checked ? "border-brand-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><span className="mr-3 font-black text-brand-700">{option.label}</span>{option.text}</button>; })}</div>{answer ? <div className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-brand-700"><CheckCircle2 className="size-5" />Đã lưu câu trả lời. Kết quả đúng hoặc sai sẽ hiển thị sau khi nộp bài.</div> : null}{error ? <ErrorBox message={error} /> : null}<div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" disabled={index === 0 || submitting} onClick={onPrevious}>Câu trước</Button>{!answer ? <Button disabled={submitting || !selection.length} onClick={onSubmitAnswer}>{submitting && pendingAnswer ? <LoaderCircle className="size-4 animate-spin" /> : null}Lưu câu trả lời</Button> : null}{!last ? <Button variant="secondary" disabled={submitting} onClick={onNext}>{answer ? "Câu tiếp" : "Bỏ qua / Câu tiếp"}</Button> : null}{last || attempt.answeredCount === attempt.totalQuestions ? <Button disabled={submitting} onClick={onFinalize}>Nộp bài</Button> : null}</div>{error && pendingAnswer ? <Button variant="outline" className="mt-3" onClick={onRetryAnswer}><RotateCcw className="size-4" /> Gửi lại câu trả lời</Button> : null}{error && pendingSubmitId ? <Button variant="outline" className="mt-3" onClick={onRetryFinalize}><RotateCcw className="size-4" /> Thử nộp lại</Button> : null}</article></>;
}
function ResultPanel({ result, onRestart }: { result: StudyCoachQuizResult; onRestart: () => void }) {
  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"><div className="text-center"><CheckCircle2 className="mx-auto size-12 text-emerald-600" /><h2 className="mt-3 text-2xl font-black text-slate-950">Hoàn thành quiz</h2><p className="mt-3 text-4xl font-black text-brand-700">{result.correctCount}/{result.totalQuestions}</p><p className="mt-1 text-lg font-bold text-slate-600">{result.percentage}%</p></div><div className="mt-6 grid grid-cols-3 gap-3 text-center"><Metric label="Đúng" value={result.correctCount} /><Metric label="Sai" value={result.incorrectCount} /><Metric label="Bỏ trống" value={result.unansweredCount} /></div><div className="mt-6 space-y-2">{result.questions.map((question) => <ResultQuestion key={question.questionId} question={question} />)}</div><Button className="mt-6" onClick={onRestart}><RotateCcw className="size-4" /> Làm lượt mới</Button></section>;
}
function ResultQuestion({ question }: { question: StudyCoachQuizResult["questions"][number] }) {
  const unanswered = question.selectedOptionIndexes.length === 0;
  const label = unanswered ? "Chưa trả lời" : question.isCorrect ? "Trả lời đúng" : "Trả lời sai";
  const tone = unanswered ? "text-slate-500" : question.isCorrect ? "text-emerald-700" : "text-rose-700";
  return <article className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">{unanswered ? <CircleHelp className="mt-0.5 size-5 shrink-0 text-slate-400" /> : question.isCorrect ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />}<div><p className={`text-xs font-black ${tone}`}>Câu {question.order} · {label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{question.content}</p></div></article>;
}
function LoadingPanel() { return <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle className="size-8 animate-spin text-brand-600" /></div>; }
function ErrorBox({ message }: { message: string }) { return <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{message}</p>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-950">{value}</p><p className="text-xs font-bold text-slate-500">{label}</p></div>; }
function StatePanel({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) { return <section className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card"><div><CircleHelp className="mx-auto size-10 text-brand-600" /><h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-500">{detail}</p>{action && onAction ? <Button className="mt-5" onClick={onAction}>{action}</Button> : null}</div></section>; }
function createClientEventId(scope: string) { return `${scope}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`; }
function messageOf(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
