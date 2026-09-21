/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
global.IS_REACT_ACT_ENVIRONMENT = true;
global.window = { addEventListener() {}, removeEventListener() {} };
const flush = () => new Promise(setImmediate);

const analysis = {
  generatedAt: "2026-09-21T15:00:00Z", source: "AI", model: "internal-model-id",
  headline: "Báo cáo đã lưu", summary: "Cần củng cố Hình học.", strengths: [], concerns: [], recommendations: [],
  lessonPlan: { focus: "Hình học", objective: "Ôn tập", activities: ["Luyện tập"], durationMinutes: 30 },
};
const empty = { status: "NOT_STARTED", analysis: null, snapshot: null, hasNewData: false, canAnalyze: true, currentSubmittedStudentCount: 1, error: null };
const saved = { ...empty, status: "READY", analysis, snapshot: { title: "Kiểm tra", className: "12A", subjectName: "Toán", totalPoints: 10, enrolledStudentCount: 8, submittedStudentCount: 1, averagePercentage: 20, averageDurationSeconds: 90 } };

async function renderPage(t, initial, allowed = true) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const store = { current: initial, requests: [], gets: 0 };
  const filename = path.resolve("components/assessment/exam-analysis-page.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id === "next/navigation") return { useParams: () => ({ id: "exam" }) };
    if (id === "lucide-react") return new Proxy({}, { get: () => () => React.createElement("svg") });
    if (id === "@/context/permissions-context") return { usePermissions: () => ({ can: () => allowed, loading: false }) };
    if (id === "@/components/assessment/assessment-shell") return { AssessmentShell: (props) => React.createElement("main", props) };
    if (id === "@/components/assessment/exam-detail-tabs") return { ExamDetailTabs: () => React.createElement("nav", null, "Phân tích AI") };
    if (id === "@/components/ui/button") return { Button: (props) => React.createElement("button", props) };
    if (id === "@/lib/subject-localization") return { toVietnameseSubjectName: (value) => value };
    if (id === "@/lib/assessment-api") return { examService: {
      getExamById: async () => ({ title: "Kiểm tra", className: "12A", subjectName: "Toán" }),
      getClassAnalysis: async () => { store.gets++; return store.current; },
      analyzeClassReport: async (examId, refresh = false) => { store.requests.push({ examId, refresh }); store.current = { ...store.current, status: "QUEUED", error: null }; return store.current; },
    } };
    return originalRequire(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  let renderer;
  const mount = async () => { await act(async () => { renderer = create(React.createElement(loaded.exports.ExamAnalysisPage)); await flush(); }); };
  await mount();
  t.after(async () => { await act(async () => renderer.unmount()); });
  return {
    store, text: () => JSON.stringify(renderer.toJSON()), button: () => renderer.root.findByType("button"),
    tick: async (ms = 3_000) => { await act(async () => { t.mock.timers.tick(ms); await flush(); }); },
    remount: async () => { await act(async () => renderer.unmount()); await mount(); },
  };
}

test("reopening a saved report never calls AI and hides model metadata", async (t) => {
  const page = await renderPage(t, saved);
  assert.match(page.text(), /Báo cáo đã lưu/);
  assert.match(page.text(), /Đã lưu báo cáo/);
  assert.doesNotMatch(page.text(), /internal-model-id/);
  await page.remount();
  assert.deepEqual(page.store.requests, []);
});

test("starts a first analysis, resumes polling after reload, then displays the persisted result", async (t) => {
  const page = await renderPage(t, empty);
  assert.deepEqual(page.store.requests, [{ examId: "exam", refresh: false }]);
  assert.match(page.text(), /Đã tiếp nhận yêu cầu/);
  await page.remount();
  assert.equal(page.store.requests.length, 1);
  page.store.current = saved;
  await page.tick();
  assert.match(page.text(), /Đã lưu báo cáo/);
  assert.equal(page.button().props.disabled, false);
});

test("new data requires explicit refresh, with the saved report preserved through processing and failure", async (t) => {
  const page = await renderPage(t, { ...saved, hasNewData: true, currentSubmittedStudentCount: 2 });
  assert.match(page.text(), /Có dữ liệu mới/);
  assert.deepEqual(page.store.requests, []);
  await act(async () => { page.button().props.onClick(); await flush(); });
  assert.deepEqual(page.store.requests, [{ examId: "exam", refresh: true }]);
  assert.match(page.text(), /Báo cáo đã lưu/);
  assert.equal(page.button().props.disabled, true);
  page.store.current = { ...page.store.current, status: "FAILED", error: "Dịch vụ chưa sẵn sàng" };
  await page.tick();
  assert.match(page.text(), /Dịch vụ chưa sẵn sàng/);
  assert.match(page.text(), /Báo cáo trước đó vẫn được giữ/);
  assert.match(page.text(), /Báo cáo đã lưu/);
  assert.equal(page.store.requests.length, 1);
});

test("does not start AI for an empty exam", async (t) => {
  const page = await renderPage(t, { ...empty, canAnalyze: false, currentSubmittedStudentCount: 0 });
  assert.match(page.text(), /Chưa có bài nộp/);
  assert.equal(page.button().props.disabled, true);
  assert.deepEqual(page.store.requests, []);
});

test("does not read or start analysis without permission", async (t) => {
  const page = await renderPage(t, empty, false);
  assert.match(page.text(), /Bạn chưa có quyền/);
  assert.equal(page.store.gets, 0);
  assert.deepEqual(page.store.requests, []);
});
