import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
const originalWindow = globalThis.window;
const storage = new Map();
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
try {
  const { mockProjects } = await server.ssrLoadModule("/src/data/mock-projects.ts");
  const { advanceProjectStage, selectProjectStage, persistProjectWorkflow, restoreProjectWorkflow } = await server.ssrLoadModule("/src/lib/decision-workspace.ts");
  const { appendDiligenceNotification, markProjectNotificationRead, markAllProjectNotificationsRead, readProjectNotifications, writeProjectNotifications } = await server.ssrLoadModule("/src/lib/project-notifications.ts");
  const demo = readProjectNotifications();
  assert.equal(demo.filter((item) => !item.readAt).length, 1);
  assert.equal(demo.find((item) => !item.readAt).projectId, "proj-haizhi");
  assert.ok(demo.find((item) => item.projectId === "proj-aurora").readAt);

  const early = { ...mockProjects.find((item) => item.id === "proj-nebula"), id: "notification-test", name: "通知验证项目", lifecycleStage: "contact", currentLifecycleStage: "contact", completedLifecycleStages: [] };
  assert.equal(appendDiligenceNotification(demo, early), demo, "Contact does not notify the committee");
  assert.equal(advanceProjectStage(early, "diligence"), null, "Actual advancement cannot skip early stages");
  const intake = advanceProjectStage(early, "intake");
  const approved = advanceProjectStage(intake, "approved");
  assert.equal(appendDiligenceNotification(demo, approved), demo, "Filing and approval remain quiet");
  const diligence = advanceProjectStage(approved, "diligence");
  const notified = appendDiligenceNotification(demo, diligence, "2026-09-09T12:00:00+08:00");
  assert.equal(notified.length, demo.length + 1);
  assert.equal(appendDiligenceNotification(notified, diligence), notified, "Repeated events and renders do not duplicate notifications");
  const read = markProjectNotificationRead(notified, notified[0].id, "2026-09-09T12:01:00+08:00");
  writeProjectNotifications(read);
  assert.deepEqual(readProjectNotifications(), read, "New notifications and read state survive reload");
  assert.ok(markAllProjectNotificationsRead(read).every((item) => item.readAt));
  assert.equal(markProjectNotificationRead(read, read[0].id)[0].readAt, read[0].readAt, "Reading again keeps the original timestamp");

  const decision = advanceProjectStage(diligence, "decided");
  const history = selectProjectStage(decision, "approved", "investment-director");
  assert.equal(history.currentLifecycleStage, "decided");
  assert.equal(history.decision, decision.decision, "History viewing retains the existing decision object");
  assert.equal(selectProjectStage(decision, "approved", "committee-lead"), decision, "Committee members cannot open an early stage");
  const notificationTarget = selectProjectStage(history, history.currentLifecycleStage, "committee-lead");
  assert.equal(notificationTarget.lifecycleStage, "decided", "Opening a diligence notification shows the current project phase");
  assert.equal(notificationTarget.decision, decision.decision);
  assert.equal(appendDiligenceNotification(notified, notificationTarget), notified, "Opening an old notice does not create another event");

  const persisted = { ...diligence, earlyStageRecords: { approved: { conclusion: "完成立项" } } };
  persistProjectWorkflow([persisted]);
  const reloaded = restoreProjectWorkflow([early])[0];
  assert.equal(reloaded.currentLifecycleStage, "diligence", "The notified project's actual progress survives reload");
  assert.equal(reloaded.lifecycleStage, "diligence");
  assert.deepEqual(reloaded.completedLifecycleStages, ["contact", "intake", "approved"]);
  assert.equal(reloaded.earlyStageRecords.approved.conclusion, "完成立项");

  const aurora = mockProjects.find((item) => item.id === "proj-aurora");
  persistProjectWorkflow([{ ...aurora, lifecycleStage: "diligence", currentLifecycleStage: "diligence" }]);
  const restoredAurora = restoreProjectWorkflow([aurora])[0];
  assert.equal(restoredAurora.currentLifecycleStage, "decided", "Old persisted progress cannot downgrade the bundled default");
  assert.equal(restoredAurora.decision.result, "conditional");
  console.log("PASS: early-stage quietness, sequential advancement, notification deduplication, read persistence, historical navigation and workflow restoration.");
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  await server.close();
}
