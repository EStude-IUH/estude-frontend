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

test("parent sees the dedicated reviewed learning alert even when it is outside the ordinary notification list", async (t) => {
  const handlers = {};
  let refreshed = 0;
  global.window = { addEventListener: (event, handler) => { handlers[event] = handler; }, removeEventListener: (event) => { delete handlers[event]; }, setInterval: () => 1, clearInterval() {} };
  const filename = path.resolve("components/parent/parent-overview-panels.tsx");
  const loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id === "lucide-react") return new Proxy({}, { get: () => () => React.createElement("svg") });
    if (id === "@/lib/engagement-api") return { parentEngagementService: { getOverview: async () => { refreshed++; return {
      attendance: [], upcomingExams: [], notifications: [], learningAlerts: [{ id: 'notice', title: 'Cần phối hợp học tập: An', senderName: 'Cô Lan', createdAt: '2026-09-21', message: 'Môn Lịch sử\nCần ôn lại Hội nghị Ianta.', actionUrl: '/parent#learning-alerts' }],
    }; } } };
    return originalRequire(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  let renderer;
  await act(async () => { renderer = create(React.createElement(loaded.exports.ParentOverviewPanels)); await new Promise(setImmediate); });
  t.after(async () => { await act(async () => renderer.unmount()); delete global.window; });
  assert.ok(renderer.root.findByProps({ id: 'learning-alerts' }));
  assert.match(JSON.stringify(renderer.toJSON()), /Hội nghị Ianta/);
  assert.match(JSON.stringify(renderer.toJSON()), /Cô Lan/);
  await act(async () => { handlers.focus(); await new Promise(setImmediate); });
  assert.equal(refreshed, 2);
});
