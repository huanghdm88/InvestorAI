import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const { mockProjects } = await server.ssrLoadModule("/src/data/mock-projects.ts");
  const { getEarlyStageBrief } = await server.ssrLoadModule("/src/data/early-stage-demo.ts");
  const { EarlyStageWorkspace } = await server.ssrLoadModule("/src/components/project/EarlyStageWorkspace.tsx");
  const { ProjectStageTrack } = await server.ssrLoadModule("/src/components/project/ProjectStageTrack.tsx");
  const { CommitteeOverview } = await server.ssrLoadModule("/src/components/project/CommitteeOverview.tsx");
  const { LocaleProvider } = await server.ssrLoadModule("/src/lib/i18n.tsx");
  const { TooltipProvider } = await server.ssrLoadModule("/src/components/ui/tooltip.tsx");
  const { createDecisionWorkspace } = await server.ssrLoadModule("/src/lib/decision-workspace.ts");
  const noop = () => {};
  const render = (component, props) => renderToStaticMarkup(React.createElement(LocaleProvider, null,
    React.createElement(TooltipProvider, null, React.createElement(component, props))));
  const aurora = mockProjects.find((project) => project.id === "proj-aurora");
  assert.equal(aurora.lifecycleStage, "decided");
  assert.equal(aurora.currentLifecycleStage, "decided");
  assert.deepEqual(aurora.completedLifecycleStages, ["contact", "intake", "approved", "diligence"]);
  const decision = aurora.decision ?? createDecisionWorkspace(aurora);
  assert.equal(decision.result, "conditional");
  assert.equal(decision.items.length, 4, "The default decision retains all four original demo conditions and changes");

  for (const stage of ["contact", "intake", "approved"]) {
    const review = { ...aurora, lifecycleStage: stage };
    const brief = getEarlyStageBrief(review);
    assert.ok(brief.sections.length >= 9, "Historical records include the decisions and their operational context");
    assert.ok(brief.completedAt && brief.summary.includes("2026-03-"));
    const historical = render(EarlyStageWorkspace, { project: review, manager: true, onAdvanceStage: noop, onSave: noop });
    assert.ok(historical.includes("阶段回看"));
    assert.ok(!historical.includes("编辑记录") && !historical.includes(brief.nextAction), "Completed stages cannot be edited or advanced");
    const active = { ...review, currentLifecycleStage: stage, completedLifecycleStages: [] };
    const manager = render(EarlyStageWorkspace, { project: active, manager: true, onAdvanceStage: noop, onSave: noop });
    assert.ok(manager.includes("编辑记录") && manager.includes(brief.nextAction));
    assert.equal(render(EarlyStageWorkspace, { project: active, manager: false, onAdvanceStage: noop, onSave: noop }), "", "Committee members have no early-stage work module");

    const track = render(ProjectStageTrack, { project: review, manager: true, onStageChange: noop });
    assert.ok(track.includes('aria-label="查看投决阶段"'), "Historical views retain a route back to the real current stage");
    assert.ok(track.includes('aria-label="回看接触阶段"'));
    const committeeTrack = render(ProjectStageTrack, { project: review, manager: false, onStageChange: noop });
    assert.ok(!committeeTrack.includes('aria-label="回看接触阶段"'));
    const overview = render(CommitteeOverview, { project: active, showCurrentFocus: true, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop,
      beforeQuestions: React.createElement("p", null, "DILIGENCE-WORK-MODULE"), onAdvanceStage: noop, onEarlyStageSave: noop });
    assert.ok(overview.includes(brief.title));
    assert.ok(!overview.includes("DILIGENCE-WORK-MODULE") && !overview.includes("当前关注"), "Early stages do not render diligence work");
  }

  const saved = getEarlyStageBrief({ ...aurora, lifecycleStage: "intake", earlyStageRecords: { intake: { "项目负责人": "用户指定负责人" } } });
  assert.equal(saved.sections.find((section) => section.label === "项目负责人").value, "用户指定负责人");
  const fresh = getEarlyStageBrief({ ...aurora, id: "fresh-project", lifecycleStage: "contact", currentLifecycleStage: "contact" });
  assert.ok(fresh.sections.every((section) => section.value === "待补充"), "A new project never inherits another company's demo facts");
  const diligence = render(CommitteeOverview, { project: { ...aurora, lifecycleStage: "diligence" }, showCurrentFocus: true, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop });
  assert.match(diligence, /class="ic-overview-summary-toggle" aria-expanded="true"/);
  assert.match(diligence, /class="ic-project-market" open=""/);
  assert.ok(diligence.includes("项目依据") && diligence.includes("ic-question-detail-grid"), "Manager project evidence starts expanded");
  const committee = render(CommitteeOverview, { project: { ...aurora, lifecycleStage: "diligence" }, showCurrentFocus: false, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop });
  assert.ok(!committee.includes("当前关注"));
  console.log("PASS: early-stage role separation, historical read-only views, current-stage return, saved fields, default expansion, and complete default decision scenario.");
} finally {
  await server.close();
}
