import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { mockProjects } = await server.ssrLoadModule("/src/data/mock-projects.ts");
  const { restoreProjectWorkflow, selectProjectStage, applyDecisionAction, getDecisionAttention, decisionQuestionContext, snapshotTask } = await server.ssrLoadModule("/src/lib/decision-workspace.ts");
  const { getCommitteeBrief } = await server.ssrLoadModule("/src/data/committee-briefs.ts");
  const { buildManagerTaskResult, buildManagerTaskChoice, buildManagerTaskProcess, getManagerTaskLabel, getManagerTaskIntent } = await server.ssrLoadModule("/src/lib/manager-tasks.ts");
  const { getReportVersions } = await server.ssrLoadModule("/src/lib/report-review.ts");
  const { buildQuestionResult, consumeQuestionDraft } = await server.ssrLoadModule("/src/lib/question-context.ts");
  const { getQuestionPathModel } = await server.ssrLoadModule("/src/data/question-paths.ts");
  const { CommitteeWorkspace } = await server.ssrLoadModule("/src/components/project/CommitteeWorkspace.tsx");
  const { ReportVersionList } = await server.ssrLoadModule("/src/components/project/ReportVersionsSheet.tsx");
  const { RollingAmount, getDigitRoll, StageTypewriter, getTypewriterFrames, getStageMotionDirection, createStageReveal } = await server.ssrLoadModule("/src/components/project/StageMotion.tsx");
  const { CommitteeOverview } = await server.ssrLoadModule("/src/components/project/CommitteeOverview.tsx");
  const { getDecisionExecutionSummary } = await server.ssrLoadModule("/src/components/project/DecisionWorkspacePanel.tsx");
  const { LocaleProvider } = await server.ssrLoadModule("/src/lib/i18n.tsx");
  const { TooltipProvider } = await server.ssrLoadModule("/src/components/ui/tooltip.tsx");
  const { buildReportHtml } = await server.ssrLoadModule("/src/lib/report-html.ts");
  const noop = () => {};
  const render = (component, props) => renderToStaticMarkup(React.createElement(LocaleProvider, null, React.createElement(TooltipProvider, null, React.createElement(component, props))));
  const base = { ...mockProjects.find((project) => project.id === "proj-aurora"), lifecycleStage: "diligence", currentLifecycleStage: "diligence", decision: undefined };
  const before = JSON.stringify(base);
  const project = restoreProjectWorkflow([{ ...base, lifecycleStage: "decided", currentLifecycleStage: "decided" }])[0];
  assert.equal(JSON.stringify(base), before, "No mutation of original diligence project");
  assert.equal(project.decision.result, "conditional");
  assert.equal(project.decision.valuation, "人民币 11.8 亿元");
  assert.equal(getCommitteeBrief(project).valuation, "人民币 12.6 亿元");
  assert.equal(project.decision.financing, null);
  assert.equal(project.decision.investment, null);
  assert.equal(project.decision.date, null);
  assert.equal(getDecisionExecutionSummary(project.decision), "演示决议有条件通过：已落实 1 项，待落实 2 项，另有 1 项重大变化待复核。");
  const allVerified = { ...project.decision, items: project.decision.items.map((item) => ({ ...item, status: "verified" })) };
  assert.equal(getDecisionExecutionSummary(allVerified), "演示决议有条件通过：已落实 3 项，待落实 0 项。");
  const submittedOnly = { ...project.decision, items: project.decision.items.map((item) => ({ ...item, status: "submitted" })) };
  assert.ok(getDecisionExecutionSummary(submittedOnly).includes("已落实 0 项，待落实 3 项"), "Submission is not completed execution");
  assert.equal(getDecisionExecutionSummary({ ...project.decision, items: [] }), "演示决议有条件通过：落实条件待确认。");
  assert.equal(getDecisionExecutionSummary({ ...project.decision, result: "pending", items: [] }), "演示决议结果待确认，落实条件尚未明确。");
  for (const result of ["deferred", "rejected"]) assert.ok(getDecisionExecutionSummary({ ...allVerified, result }).includes("不进入签约或出资落实"));
  assert.deepEqual(project.files, base.files);
  assert.equal(project.financingRound, base.financingRound);
  assert.equal(project.status, base.status);
  const roundTrip = selectProjectStage(selectProjectStage(project, "diligence"), "decided");
  assert.deepEqual(roundTrip.decision, project.decision);
  assert.equal(selectProjectStage(base, "decided"), base, "Navigation cannot create a new decision or advance actual progress");
  assert.equal(selectProjectStage(project, "funded"), project, "No unimplemented authorization shortcut");
  for (const candidate of mockProjects.filter((item) => item.id !== base.id).concat([{ ...base, id: "new-project", files: [] }, { ...base, files: [] }])) {
    const pending = restoreProjectWorkflow([{ ...candidate, lifecycleStage: "decided", currentLifecycleStage: "decided", decision: undefined }])[0];
    assert.equal(pending.decision.result, "pending");
    assert.equal(pending.decision.valuation, null);
    assert.equal(pending.decision.items.length, 0);
    assert.ok(!JSON.stringify(pending.decision).includes("11.8"));
  }
  const cashId = "aurora-condition-cash";
  const file = { id: "proof-1", name: "补充凭证.pdf", kind: "pdf", size: "1 MB", status: "parsing", uploadedAt: "2026-09-08", category: "其他" };
  assert.equal(applyDecisionAction(project, { type: "attach", itemId: cashId, files: [file] }, "committee-lead"), project);
  assert.equal(applyDecisionAction(project, { type: "attach", itemId: "foreign-project-item", files: [file] }, "investment-director"), project);
  let changed = applyDecisionAction(project, { type: "attach", itemId: cashId, files: [file] }, "investment-director");
  const cash = () => changed.decision.items.find((item) => item.id === cashId);
  assert.equal(cash().status, "review", "Upload is not verification");
  assert.equal(applyDecisionAction(changed, { type: "attach", itemId: cashId, files: [file] }, "investment-director"), changed);
  changed = applyDecisionAction(changed, { type: "mute", itemId: cashId }, "investment-director");
  assert.equal(cash().status, "review");
  assert.ok(!getDecisionAttention(changed.decision, "investment-director").some((item) => item.id === cashId));
  assert.ok(getDecisionAttention(changed.decision, "committee-lead").some((item) => item.id === cashId), "Manager mute cannot hide committee issues");
  assert.equal(applyDecisionAction(changed, { type: "review-demo", itemId: cashId, outcome: "verified", note: "" }, "investment-director"), changed);
  changed = applyDecisionAction(changed, { type: "review-demo", itemId: cashId, outcome: "supplement", note: "缺少差额凭证" }, "investment-director");
  assert.equal(cash().status, "supplement");
  changed = applyDecisionAction(changed, { type: "review-demo", itemId: cashId, outcome: "verified", note: "模拟授权复核完成" }, "investment-director");
  assert.equal(cash().status, "verified");
  assert.ok(!getDecisionAttention(changed.decision, "committee-lead").some((item) => item.id === cashId));
  assert.equal(changed.lifecycleStage, "decided");
  changed = applyDecisionAction(changed, { type: "remove-evidence", itemId: cashId, fileId: file.id }, "investment-director");
  assert.equal(cash().status, "missing", "Removing evidence reopens the condition");
  changed = applyDecisionAction(changed, { type: "submit", itemId: "aurora-change-margin", note: "请核对原成本假设是否仍成立" }, "investment-director");
  assert.equal(changed.decision.items.find((item) => item.id === "aurora-change-margin").status, "submitted");
  assert.equal(changed.decision.result, "conditional");
  assert.deepEqual(changed.decision.approvedReport, project.decision.approvedReport);
  changed = applyDecisionAction(changed, { type: "assign", itemId: cashId, owner: "项目经理 A", deadline: "2026-09-18" }, "investment-director");
  assert.equal(cash().owner, "项目经理 A");
  assert.equal(cash().deadline, "2026-09-18");
  assert.equal(cash().status, "missing", "Assigning work cannot complete a condition");

  const snapshot = snapshotTask(project, "investment-director", project.decision.approvedReport);
  const later = selectProjectStage(project, "diligence");
  later.decision = { ...later.decision, valuation: "不应混入快照" };
  assert.equal(snapshot.project.lifecycleStage, "decided");
  assert.equal(snapshot.project.decision.valuation, "人民币 11.8 亿元");
  const choice = buildManagerTaskChoice("", [file], snapshot);
  assert.equal(choice.taskSnapshot.userRole, "investment-director");
  assert.equal(choice.options[1].label, "生成报告");
  assert.equal(choice.options[2].label, "重大变化评估");
  const refs = getCommitteeBrief(base).questions.flatMap((item) => item.sources);
  for (const kind of ["fact-check", "investment-report", "challenge"]) {
    const blocks = buildManagerTaskResult(snapshot.project, kind, "<script>unsafe</script>", [{ ...file, name: "另一份投决议案.pdf" }]);
    const report = blocks[1];
    assert.deepEqual(blocks.map((block) => block.kind), ["text", "project-work-report"]);
    assert.equal(report.sourceReport.id, project.decision.approvedReport.id, "An uploaded report cannot replace the approved baseline");
    assert.equal(report.projectStage, "decided");
    assert.ok(report.title.includes(getManagerTaskLabel(kind, "decided")));
    assert.equal(report.suggestedChanges, undefined, "Decision verification is not an old diligence rewrite");
    assert.ok(report.citations.every((source) => refs.some((original) => JSON.stringify(original) === JSON.stringify(source))));
    assert.ok(!buildReportHtml(report).includes("<script>unsafe</script>"));
    assert.ok(buildManagerTaskProcess(project, kind).title.includes(getManagerTaskLabel(kind, "decided")));
  }
  assert.equal(getManagerTaskIntent("生成报告：核对质询和批准要求"), "investment-report");
  assert.equal(getManagerTaskIntent("重大变化评估：检查投资报告"), "challenge");
  const context = decisionQuestionContext(project, project.decision.items[0]);
  assert.equal(context.stage, "decided");
  const response = buildQuestionResult("怎么办", context);
  assert.equal(response[1].context.decisionId, project.decision.id);
  assert.ok(!response[0].text.includes("会上建议"));
  assert.ok(getQuestionPathModel(context).paths[2].action.includes("有权限"));
  const completedContext = decisionQuestionContext(project, { ...project.decision.items[0], status: "verified", note: "演示核验完成" });
  assert.ok(buildQuestionResult("现在怎么样", completedContext)[0].text.includes("不再作为未完成条件提醒"));
  const conversations = [{ id: "chat", questionContext: context, draftText: "问题", draftAttachments: [file], messages: [{ questionContext: context }] }];
  assert.equal(consumeQuestionDraft(conversations, "chat")[0].questionContext, undefined);
  assert.equal(conversations[0].messages[0].questionContext, context);

  const originalReport = buildManagerTaskResult(base, "investment-report", "议案")[1];
  const executionReport = buildManagerTaskResult(project, "investment-report", "落实说明")[1];
  const entries = [originalReport, executionReport].map((block, index) => ({ id: `report-${index}`, projectId: project.id, block, createdAt: `2026-09-0${index + 1}` }));
  assert.deepEqual(getReportVersions(project, project.decision.approvedReport.id, entries).map((entry) => entry.id), ["report-0"]);
  assert.deepEqual(getReportVersions(project, project.decision.approvedReport.id, entries, "decided").map((entry) => entry.id), ["report-1"]);
  const versionHtml = render(ReportVersionList, { project, selectedId: project.decision.approvedReport.id, reports: entries, onSelectSource: noop, onOpenReport: noop, locked: true });
  assert.ok(versionHtml.includes("决议后补充报告") && versionHtml.includes("决议落实说明"));
  assert.ok(!versionHtml.includes(">切换</button>"));
  const props = { project, projects: [project], conversations: [], reports: entries, currentConversationId: null, conversationOpen: false,
    onSelectProject: noop, onNewProject: noop, onOpenConversation: noop, onNewConversation: noop, onCloseConversation: noop, onLogout: noop, onSwitchRole: noop,
    onUpdateFiles: noop, onOpenReport: noop, onViewSource: noop, onAsk: noop, onDraftTask: noop, onStageChange: noop, onDecisionAction: noop,
    assistantContent: null, composerContent: React.createElement("textarea", { "aria-label": "persistent-input" }) };
  for (const role of ["investment-director", "committee-lead"]) {
    const html = render(CommitteeWorkspace, { ...props, role });
    for (const label of ["投决结论", "决议落实", "当前报告", "投决情景演示", "会前关注去向", "人民币 11.8 亿元"]) assert.ok(html.includes(label), `${role}: ${label}`);
    assert.equal(html.includes('id="decision-attention-title"'), role === "investment-director", "Only managers see the decision current-focus section");
    assert.ok(html.includes(getDecisionExecutionSummary(project.decision)) && !html.includes("以本次决议为执行基准"));
    assert.match(html, /class="decision-execution"[^>]*><details open=""/);
    assert.match(html, /<details open="" class="decision-question-archive"/);
    assert.ok(!html.includes("manager-pending-changes"));
    assert.ok(!html.includes("decision-demo-note") && !html.includes("后续变更不会覆盖本次决议基准"), "Remove supplementary notes; retain resolution status and execution items");
    assert.ok(html.includes("persistent-input"));
    const floatingComposer = html.match(/<div[^>]*id="project-floating-composer"[^>]*>/)?.[0] ?? "";
    assert.ok(floatingComposer);
    assert.equal(floatingComposer.includes('hidden=""'), role === "committee-lead");
    const resolution = html.slice(html.indexOf('class="decision-resolution"'), html.indexOf('class="decision-question-archive"'));
    assert.ok(resolution.includes('class="decision-execution"') && resolution.includes('<h3 id="decision-execution-title">决议落实</h3>'), "The shared resolution keeps execution accessible for both roles");
    assert.equal((html.match(/id="decision-execution-title"/g) ?? []).length, 1);
    const removed = render(CommitteeWorkspace, { ...props, role, project: { ...project, files: [] } });
    assert.ok(removed.includes(project.decision.approvedReport.name) && removed.includes("原文件不在资料库中"));
  }
  const clear = { ...project, decision: { ...project.decision, result: "approved", items: project.decision.items.map((item) => ({ ...item, status: "verified" })) } };
  assert.ok(!render(CommitteeWorkspace, { ...props, role: "committee-lead", project: clear }).includes("暂无需再次审议的重大变化"));
  assert.ok(render(CommitteeWorkspace, { ...props, role: "investment-director", project: clear }).includes("暂无需再次审议的重大变化"));
  for (let from = 0; from < 10; from++) for (let to = 0; to < 10; to++) for (const direction of [-1, 1]) {
    const roll = getDigitRoll(from, to, direction);
    assert.equal(roll.start % 10, from);
    assert.equal(roll.end % 10, to);
    assert.ok(roll.end >= 0 && roll.end < 30);
  }
  const amountHtml = render(RollingAmount, { value: "人民币 11.8 亿元" });
  assert.ok(amountHtml.includes('class="sr-only">人民币 11.8 亿元</span>') && amountHtml.includes('aria-hidden="true"'));
  assert.ok(render(RollingAmount, { value: null }).includes('class="sr-only">待确认</span>'));
  const agenda = project.decision.summary;
  const typedHtml = render(StageTypewriter, { text: agenda, stage: "decided", projectId: project.id });
  assert.ok(typedHtml.includes(`<span class="sr-only">${agenda}</span>`), "Assistive text is the full final sentence, not individual typing frames");
  assert.ok(typedHtml.includes(`<span class="ic-agenda-layout" aria-hidden="true">${agenda}</span>`));
  assert.ok(typedHtml.includes(`<span class="ic-agenda-typed" aria-hidden="true">${agenda}</span>`), "First render is complete");
  for (const text of [agenda, getCommitteeBrief(base).agenda, "核验 e\u0301 / 👨‍👩‍👧‍👦 后再投决。", "A", ""]) {
    const frames = getTypewriterFrames(text);
    assert.equal(frames.at(-1), text);
    if (text) assert.ok(frames.every((frame) => frame.length > 0 && text.startsWith(frame)), "No blank or stale intermediate copy");
    assert.ok(frames.every((frame, index) => index === 0 || frame.startsWith(frames[index - 1])));
  }
  assert.deepEqual(getTypewriterFrames("e\u0301👨‍👩‍👧‍👦"), ["e\u0301", "e\u0301👨‍👩‍👧‍👦"]);
  for (const [candidate, label, text] of [[base, "本次审议", getCommitteeBrief(base).agenda], [project, "本次投决", agenda], [{ ...project, decision: undefined }, "本次投决", "投决结果待确认。"]]) {
    const html = render(CommitteeOverview, { project: candidate, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop });
    assert.ok(html.includes(`<div class="ic-overview-agenda"><span>${label}</span><p class="ic-agenda-copy">`));
    assert.ok(html.includes(`<span class="sr-only">${text}</span>`));
    assert.ok(!/class="decision-stage-body[^"\n]*"><div class="ic-overview-agenda"/.test(html), "Agenda is outside the fading stage container");
  }
  const motionSource = await readFile(new URL("../src/components/project/StageMotion.tsx", import.meta.url), "utf8");
  assert.ok(motionSource.includes("prefers-reduced-motion") && motionSource.includes("mm.revert()") && motionSource.includes("revertOnUpdate: true"));
  const typewriterSource = motionSource.slice(motionSource.indexOf("export function StageTypewriter"), motionSource.indexOf("export function getStageMotionDirection"));
  assert.ok(typewriterSource.includes("last.projectId === projectId && last.stage !== stage && last.text !== text"));
  assert.ok(typewriterSource.includes("ctx.conditions?.reduce || completed") && typewriterSource.includes("mm.revert(); finish();"));
  assert.ok(typewriterSource.includes("dependencies: [text, stage, projectId], revertOnUpdate: true"));
  assert.ok(!/autoAlpha|opacity|height:|setTimeout|key=/.test(typewriterSource), "Typewriter neither fades/remounts the paragraph nor grows it frame by frame");
  for (const [from, to, expectedDirection] of [["diligence", "decided", 1], ["decided", "diligence", -1], ["diligence", "decided", 1], ["decided", "diligence", -1]]) {
    const direction = getStageMotionDirection(from, to);
    assert.equal(direction, expectedDirection);
    for (const distance of [8, 14]) {
      const target = { y: 0, autoAlpha: 1, clearProps: "" };
      const reveal = createStageReveal(target, direction, distance).pause();
      try {
        reveal.progress(0);
        assert.equal(target.y, expectedDirection * distance);
        assert.equal(target.autoAlpha, 0.45, "Data never becomes an empty frame");
        reveal.progress(0.4);
        assert.ok(Math.abs(target.y) > 0 && Math.abs(target.y) < distance, "Both directions produce intermediate motion frames");
        assert.ok(target.autoAlpha > 0.45 && target.autoAlpha < 1);
        reveal.progress(1);
        assert.equal(target.y, 0);
        assert.equal(target.autoAlpha, 1);
      } finally { reveal.kill(); }
    }
  }
  assert.equal(getStageMotionDirection("diligence", "diligence"), 0, "Selecting the current stage does not replay motion");
  assert.equal(getStageMotionDirection("unknown", "decided"), 0);
  assert.ok(motionSource.includes("previousStage.current.projectId === projectId"), "Different projects never animate as stage transitions");
  const overviewSource = await readFile(new URL("../src/components/project/CommitteeOverview.tsx", import.meta.url), "utf8");
  assert.match(overviewSource, /<StageMotion[^>]*projectId=\{project.id\}[^>]*className="ic-metrics-motion"[^>]*>[\s\S]*?<dl className="ic-overview-metrics">[\s\S]*?<\/dl>\s*<\/StageMotion>/, "The same mounted metrics respond to stage changes, even when values stay unknown");
  assert.ok(!/<(?:StageMotion|StageTypewriter|RollingAmount)[^>]*key=\{[^}]*stage/i.test(overviewSource), "Do not reset numeric or typing history by keying on stage");
  const overviewCss = await readFile(new URL("../src/components/project/committee-overview.css", import.meta.url), "utf8");
  assert.ok(overviewCss.includes("grid-area: 1 / 1") && overviewCss.includes(".ic-agenda-layout { visibility: hidden"));
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const hook of ["nextPrompt.taskSnapshot", "t.taskSnapshot", "choice.taskSnapshot", "taskSnapshot?.project", "onStageChange=", "onDecisionAction="]) assert.ok(app.includes(hook));
  console.log("PASS: decision stage round-trip; isolated scenario/unknowns; role permissions; evidence/submit/mute/review; immutable task snapshots; approved baseline and version separation; stage-aware reports/replies; shared role rendering; 200 digit-roll cases and reduced-motion contracts.");
} finally {
  await server.close();
}
