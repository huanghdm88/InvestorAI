import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`);
  const { mockProjects } = await load("data/mock-projects.ts");
  const { mockConversations } = await load("data/mock-conversations.ts");
  const { extractConversationReports } = await load("lib/project-reports.ts");
  const { applyProjectUpdate, canonicalLibraryFiles, getPendingProjectChanges } = await load("lib/project-changes.ts");
  const { localizeProject } = await load("lib/content-localization.ts");
  const { getCommitteeAnalysisQuestions } = await load("data/committee-analysis-questions.ts");
  const { getCommitteeBrief } = await load("data/committee-briefs.ts");
  const { CommitteeWorkspace } = await load("components/project/CommitteeWorkspace.tsx");
  const { ProjectChangesPanel } = await load("components/project/ProjectChangesPanel.tsx");
  const { CommitteeAnalysisQuestions, focusQuestionId } = await load("components/project/CommitteeAnalysisQuestions.tsx");
  const { LocaleProvider } = await load("lib/i18n.tsx");
  const { TooltipProvider } = await load("components/ui/tooltip.tsx");
  const noop = () => {};
  const render = (component, props) => renderToStaticMarkup(React.createElement(LocaleProvider, null, React.createElement(TooltipProvider, null, React.createElement(component, props))));
  const project = { ...mockProjects[0], lifecycleStage: "diligence", currentLifecycleStage: "diligence", completedLifecycleStages: ["contact", "intake", "approved"] };
  const baseline = JSON.stringify(project);
  const reports = mockProjects.flatMap((project) => extractConversationReports(project.id, mockConversations));
  const stamp = "2026-09-08T12:00:00Z";
  const changedCompany = applyProjectUpdate(project, { financingRound: "A 轮" }, "company", stamp);
  assert.equal(changedCompany.contextChanges.length, 1);
  assert.equal(changedCompany.contextChanges[0].origin, "company-info");
  assert.ok(changedCompany.contextChanges[0].before.includes("Pre-A") && changedCompany.contextChanges[0].after.includes("A 轮"));
  assert.equal(applyProjectUpdate(changedCompany, { financingRound: "A 轮" }, "noop", stamp).contextChanges.length, 1);

  const addedFile = { id: "new-evidence", name: "客户明细新增.xlsx", kind: "excel", size: "1 MB", category: "其他", status: "uploading", uploadedAt: stamp };
  const added = applyProjectUpdate(changedCompany, { files: [addedFile, ...project.files] }, "files", stamp);
  assert.equal(added.contextChanges.length, 2);
  assert.equal(added.contextChanges[0].origin, "knowledge-base");
  assert.deepEqual(added.contextChanges[0].sources, [], "File metadata is not a source excerpt");
  let progress = added;
  for (const status of ["parsing", "indexed"]) progress = applyProjectUpdate(progress, { files: progress.files.map((file) => file.id === addedFile.id ? { ...file, status } : file) }, status, stamp);
  assert.equal(progress.contextChanges.length, 2, "Upload progress never creates duplicate material changes");
  const enFiles = localizeProject(project, "en-US").files.map((file) => ({ ...file, status: "parsing" }));
  const enProgress = applyProjectUpdate(project, { files: canonicalLibraryFiles(project, enFiles) }, "en-progress", stamp);
  assert.equal(enProgress.contextChanges, undefined, "Localized progress is not a rename");
  assert.deepEqual(enProgress.files.map((file) => file.name), project.files.map((file) => file.name));
  const enUpload = applyProjectUpdate(project, { files: canonicalLibraryFiles(project, [addedFile, ...enFiles]) }, "en-upload", stamp);
  assert.equal(enUpload.contextChanges.length, 1);
  assert.equal(enUpload.contextChanges[0].after, addedFile.name);
  assert.equal(enUpload.contextChanges[0].before, "原有资料保留");
  const removed = applyProjectUpdate(progress, { files: progress.files.filter((file) => file.id !== addedFile.id) }, "remove", stamp);
  assert.equal(removed.contextChanges.length, 3);
  assert.equal(removed.contextChanges[0].before, addedFile.name);
  const submitted = applyProjectUpdate(project, { files: [{ ...addedFile, name: "新版报告.pdf", kind: "pdf", status: "unparsed" }, ...project.files] }, "report", stamp, "report-submission");
  assert.equal(submitted.contextChanges[0].origin, "report-submission");
  for (const stage of ["contact", "pooled", "initiated", "decided", "signed", "funded", "post-investment"]) {
    assert.equal(applyProjectUpdate({ ...project, lifecycleStage: stage }, { industry: "新行业" }, stage, stamp).contextChanges, undefined);
    assert.deepEqual(getPendingProjectChanges({ ...added, lifecycleStage: stage }, reports), []);
  }
  const changes = getPendingProjectChanges(added, reports);
  assert.equal(changes.length, 5, "Project-level list combines two context changes and three seeded report changes");
  const html = render(ProjectChangesPanel, { project: added, items: changes, decisions: {}, onDecide: noop, onViewSource: noop, onOpenReasoning: noop });
  assert.ok(html.includes("企业信息") && html.includes("知识库") && html.includes("报告分析"));
  assert.equal((html.match(/manager-review-reasoning/g) ?? []).length, 3, "Metadata changes never get invented reasoning");
  for (const decision of ["accepted", "ignored"]) {
    const handled = render(ProjectChangesPanel, { project: added, items: changes, decisions: Object.fromEntries(added.contextChanges.map((item) => [item.key, decision])), onDecide: noop, onViewSource: noop, onOpenReasoning: noop });
    assert.ok(handled.includes("已处理 2") && handled.includes("撤销"));
  }

  const actions = { onSelectProject: noop, onNewProject: noop, onOpenConversation: noop, onNewConversation: noop, onCloseConversation: noop, onLogout: noop, onSwitchRole: noop, onUpdateFiles: noop, onOpenReport: noop, onViewSource: noop, onAsk: noop, onDraftTask: noop, onReviewDecision: noop, onOpenReasoning: noop };
  for (const role of ["investment-director", "committee-lead"]) {
    const shell = render(CommitteeWorkspace, { ...actions, role, project: added, projects: [added], conversations: mockConversations, reports, currentConversationId: null, conversationOpen: false, assistantContent: null, composerContent: React.createElement("textarea", { "aria-label": "shared-input" }) });
    assert.equal((shell.match(/aria-label="shared-input"/g) ?? []).length, 1);
    const floatingComposer = shell.match(/<div[^>]*id="project-floating-composer"[^>]*>/)?.[0] ?? "";
    assert.ok(floatingComposer);
    assert.equal(floatingComposer.includes('hidden=""'), role === "committee-lead");
    assert.equal(floatingComposer.includes('inert=""'), role === "committee-lead");
    assert.equal((shell.match(/>历史对话<\/(?:button|span)>/g) ?? []).length, 1);
    for (const removedNote of ["ic-analysis-note", "ic-overview-basis", "ic-project-market-note", "ic-overview-other-note", "manager-review-note", "原文件全文预览尚未接入"]) {
      assert.ok(!shell.includes(removedNote), `${role}: remove supplementary copy without leaving its wrapper`);
    }
    assert.ok(shell.includes("演示项目"), "One compact project status remains, instead of repeated module disclaimers");
    if (role === "investment-director") {
      assert.ok(shell.indexOf('id="manager-pending-changes"') < shell.indexOf('id="manager-current-report-title"'));
      assert.ok(!shell.includes('id="ic-analysis-questions-title"'));
    } else {
      assert.ok(!shell.includes("manager-pending-changes"));
      assert.ok(shell.includes('id="ic-analysis-questions-title"'));
      assert.ok(!shell.includes('id="ic-overview-questions-title"'), "Committee members no longer see current focus");
    }
  }
  for (const project of mockProjects) {
    const questions = getCommitteeAnalysisQuestions(project, reports);
    assert.equal(questions.length, project.id === "proj-aurora" ? 3 : project.id === "proj-haizhi" ? 4 : 0);
    assert.deepEqual(getCommitteeAnalysisQuestions(project, reports.filter((report) => report.projectId !== project.id)), []);
    const core = getCommitteeBrief(project).questions;
    for (const question of questions) {
      assert.equal(question.report.projectId, project.id);
      assert.ok(reports.some((report) => report.id === question.report.id));
      assert.ok(question.sources.length > 0);
      assert.ok(!core.some((item) => item.question === question.question), "Question and current focus do not repeat the whole sentence");
      for (const id of question.relatedQuestionIds) assert.ok(core.some((item) => item.id === id && item.scope === "core"));
    }
    const panel = render(CommitteeAnalysisQuestions, { ...actions, project, reports });
    assert.ok(!panel.includes('<details open'), "Analysis questions start collapsed");
    if (questions.length) {
      assert.ok(panel.includes("分析来源") && panel.includes("推演过程") && panel.includes("项目依据") && panel.includes("就此追问"));
      assert.ok(!panel.includes("查看关联关注"), "No link targets the removed committee focus section");
      assert.ok(!panel.includes("现有演示分析") && !panel.includes("报告分析整理"), "Remove supplemental notes rather than replacing them with more descriptions");
      assert.ok(!panel.includes('data-icon="plus"'), "No decorative expansion icon");
      assert.equal((panel.match(/aria-expanded="true"/g) ?? []).length, questions.length, "Project evidence is open by default and remains keyboard-operable");
      assert.ok(!/125亿元|24\.97|32\.70|16\.28|1\.4606|3\.5459/.test(panel), "No unrelated screenshot data");
    } else assert.ok(panel.includes("项目依据待补充") || panel.includes("待验证假设"), "Shared sources can seed questions without a personal report");
  }
  const growth = getCommitteeAnalysisQuestions(project, reports).find((item) => item.id === "aurora-analysis-c-3");
  assert.deepEqual(growth.relatedQuestionIds, ["aurora-customer-growth"]);
  assert.ok(focusQuestionId(project.id, growth.relatedQuestionIds[0]).includes(project.id));
  assert.equal(JSON.stringify(project), baseline, "Model operations leave the original project untouched");

  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../src/components/project/CommitteeWorkspace.tsx", import.meta.url), "utf8");
  const composer = await readFile(new URL("../src/components/chat/ChatComposer.tsx", import.meta.url), "utf8");
  const openAssistant = shell.slice(shell.indexOf("const openAssistant ="), shell.indexOf("const collapseAssistant ="));
  assert.ok(openAssistant.includes("setComposerOpen(true)") && !/onNewConversation|onOpenConversation/.test(openAssistant));
  const collapseAssistant = shell.slice(shell.indexOf("const collapseAssistant ="), shell.indexOf("const openPendingReview ="));
  assert.ok(collapseAssistant.includes("focusComposerAfterNavigation.current = false") && collapseAssistant.includes("setMobileNavigationOpen(false)"), "Closing from mobile navigation must not refocus the hidden textarea");
  assert.match(shell, /className="composer-launcher"[\s\S]*?onClick=\{openAssistant\}/);
  assert.ok(!shell.includes('className="ic-shell-assistant-trigger"'), "A centered launcher replaces the sidebar restore button");
  assert.ok(collapseAssistant.includes('assistantTriggerRef.current.focus({ preventScroll: true })'));
  assert.ok(shell.includes("openAssistant(); onReferenceFile?.(file)"), "Referencing a document remains open-only, never a toggle");
  assert.ok(shell.includes("lastActivationRef.current === assistantActivationKey"), "Initial render does not force the committee composer open");
  assert.ok(shell.includes("focusComposerAfterNavigation.current ?"), "Mobile navigation does not always invoke the keyboard");
  assert.ok(shell.includes("target ?? mobileTriggerRef.current ?? brandTriggerRef.current"), "Directory navigation restores focus even after the mobile trigger unmounts");
  assert.ok(composer.includes("observer.observe(textarea)") && composer.includes("if (width === previousWidth) return"), "Hidden draft height is remeasured without resize feedback loops");
  assert.ok(app.includes("const homeDraftKey = personalWorkspaceKey(activeRole, currentProjectId, currentStage)"), "Home drafts are role-, project-, and stage-scoped");
  assert.ok(app.includes('const saveRevision = "sourceReport" in item &&'), "Context acceptance does not create report versions");
  assert.ok(app.includes('versions: revision ? [revision, ...previous.versions] : previous.versions'));
  assert.ok(app.includes('applyProjectUpdate(p, { files: [...incoming, ...p.files], status: "parsing" }, changeId, changeAt)'), "Quick-upload records new materials once");
  console.log("PASS: shared composer defaults and sidebar history; independent project changes with three sources; localized/progress update dedupe; role/stage isolation; 7 report-backed collapsed questions; linked focus and immutable model contracts.");
} finally { await server.close(); }
