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

function loadReport(report) {
  const filename = path.resolve(
    "components/assessment/official-grade-report.tsx",
  );
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = (id) =>
    id === "@/lib/gradebook-api"
      ? { gradebookService: { report: async () => report } }
      : original(id);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const outcome = (average) => ({
  average,
  complete: average !== null,
  assessment: null,
});
const report = {
  years: [
    { id: "year1", name: "2025–2026", status: "ACTIVE" },
    { id: "year2", name: "2024–2025", status: "COMPLETED" },
  ],
  terms: [
    {
      id: "term1",
      name: "Học kỳ I",
      academicYearId: "year1",
      status: "ACTIVE",
    },
  ],
  classes: [
    { id: "class1", academicYearId: "year1", name: "Lớp 10A", code: "10A" },
    { id: "class2", academicYearId: "year2", name: "Lớp 9A", code: "9A" },
  ],
  results: [
    {
      classId: "class1",
      academicYearId: "year1",
      annualLevel: { level: "INCOMPLETE", adjusted: false },
      semesterLevels: [
        { termId: "term1", level: "INCOMPLETE", adjusted: false },
      ],
      subjects: [
        {
          subjectId: "math",
          subjectName: "Toán",
          subjectCode: "TOAN",
          annual: outcome(null),
          semesters: [
            {
              termId: "term1",
              displayOrder: 1,
              policy: { assessmentMode: "NUMERIC" },
              marks: { regular: [0, null], midterm: 8, final: null },
              comment: "Cần bổ sung bài",
              outcome: outcome(null),
            },
          ],
        },
      ],
    },
    {
      classId: "class2",
      academicYearId: "year2",
      annualLevel: { level: "INCOMPLETE", adjusted: false },
      semesterLevels: [],
      subjects: [],
    },
  ],
};

test("official report preserves the full-year selection and resets class when year changes", async (t) => {
  const { OfficialGradeReport } = loadReport(report);
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(OfficialGradeReport));
    await new Promise(setImmediate);
  });
  t.after(async () => {
    await act(async () => renderer.unmount());
  });
  const term = () =>
    renderer.root.findByProps({ "aria-label": "Học kỳ sổ điểm" });
  assert.equal(term().props.value, "term1");
  assert.match(JSON.stringify(renderer.toJSON()), /0.0 · —/);
  assert.match(JSON.stringify(renderer.toJSON()), /Cần bổ sung bài/);
  await act(async () => term().props.onChange({ target: { value: "all" } }));
  assert.equal(term().props.value, "all");
  assert.match(JSON.stringify(renderer.toJSON()), /Học kỳ II/);
  await act(async () =>
    renderer.root
      .findByProps({ "aria-label": "Năm học sổ điểm" })
      .props.onChange({ target: { value: "year2" } }),
  );
  assert.equal(
    renderer.root.findByProps({ "aria-label": "Lớp sổ điểm" }).props.value,
    "class2",
  );
  assert.equal(term().props.value, "all");
  assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /Cần bổ sung bài/);
});

test("formatting distinguishes zero, missing assessments and comment results", () => {
  const { formatGrade, outcomeText } = loadReport(report);
  assert.equal(formatGrade(0), "0.0");
  assert.equal(formatGrade(null), "—");
  assert.equal(formatGrade("FAIL"), "Chưa đạt");
  assert.equal(outcomeText(outcome(null)), "Chưa đủ đánh giá");
  assert.equal(outcomeText(outcome(0)), "0.0");
});

function loadTeacher(view, save) {
  const filename = path.resolve("components/teacher/gradebook-panel.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id === "@/context/permissions-context")
      return { usePermissions: () => ({ can: () => true }) };
    if (id === "@/lib/assessment-api")
      return {
        academicDataService: {
          getTerms: async () => [{ id: "term", name: "HKI", status: "ACTIVE" }],
        },
      };
    if (id === "@/lib/gradebook-api")
      return { gradebookService: { get: async () => view, save } };
    if (id === "@/components/assessment/official-grade-report")
      return loadReport(report);
    return original(id);
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
  return loaded.exports.GradebookPanel;
}
const teacherView = {
  term: { status: "ACTIVE" },
  book: {
    id: "book",
    revision: 7,
    assessmentMode: "NUMERIC",
    annualPeriods: 35,
    specialized: false,
  },
  requiredRegular: 2,
  students: [
    {
      id: "student",
      fullName: "An",
      accountName: "an",
      record: null,
      outcome: outcome(null),
    },
  ],
};
const schoolClass = {
  id: "class",
  academicYearId: "year",
  subjects: [{ id: "math", name: "Toán" }],
};

test("teacher sends explicit zero and leaves absent marks null; conflict keeps edits", async (t) => {
  let payload;
  const Panel = loadTeacher(teacherView, async (_id, value) => {
    payload = value;
    throw new Error("Sổ điểm đã thay đổi");
  });
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Panel, { schoolClass }));
    await new Promise(setImmediate);
  });
  t.after(async () => {
    await act(async () => renderer.unmount());
  });
  await act(async () =>
    renderer.root
      .findAllByType("button")
      .find((item) => item.children.includes("Nhập / sửa"))
      .props.onClick(),
  );
  const input = () => renderer.root.findByProps({ "aria-label": "TX 1" });
  assert.equal(input().props.value, "");
  await act(async () => input().props.onChange({ target: { value: "0" } }));
  await act(async () =>
    renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }),
  );
  assert.deepEqual(payload, {
    studentId: "student",
    revision: 7,
    marks: { regular: [0, null], midterm: null, final: null },
    comment: "",
  });
  assert.equal(input().props.value, 0);
  assert.match(JSON.stringify(renderer.toJSON()), /Sổ điểm đã thay đổi/);
});

test("locked semester displays a read-only roster", async (t) => {
  const Panel = loadTeacher(
    { ...teacherView, term: { status: "LOCKED" } },
    async () => assert.fail("Locked book must not save"),
  );
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Panel, { schoolClass }));
    await new Promise(setImmediate);
  });
  t.after(async () => {
    await act(async () => renderer.unmount());
  });
  assert.equal(
    renderer.root
      .findAllByType("button")
      .find((item) => item.children.includes("Nhập / sửa")).props.disabled,
    true,
  );
});
