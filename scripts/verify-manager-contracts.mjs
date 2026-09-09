import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { mockProjects } = await server.ssrLoadModule("/src/data/mock-projects.ts");
  const { restoreProjectWorkflow } = await server.ssrLoadModule("/src/lib/decision-workspace.ts");
  const { getCommitteeBrief, getCoreQuestions } = await server.ssrLoadModule("/src/data/committee-briefs.ts");
  const { CommitteeWorkspace } = await server.ssrLoadModule("/src/components/project/CommitteeWorkspace.tsx");
  const { ManagerReportPanel, getCurrentReportCandidates, createManagerReportDraft, getMaterialSignature } = await server.ssrLoadModule("/src/components/project/ManagerReportPanel.tsx");
  const { hasVisibleConversation, conversationHistoryTitle, ConversationHistory } = await server.ssrLoadModule("/src/components/project/ConversationHistory.tsx");
  const { buildManagerTaskResult, buildManagerTaskProcess, buildManagerTaskChoice, getManagerTaskIntent, managerTaskLabels } = await server.ssrLoadModule("/src/lib/manager-tasks.ts");
  const { ChatComposer } = await server.ssrLoadModule("/src/components/chat/ChatComposer.tsx");
  const { ReportContent } = await server.ssrLoadModule("/src/components/chat/ReportContent.tsx");
  const { ModePickCard } = await server.ssrLoadModule("/src/components/chat/ModePickCard.tsx");
  const { ProjectStageTrack } = await server.ssrLoadModule("/src/components/project/ProjectStageTrack.tsx");
  const { LocaleProvider } = await server.ssrLoadModule("/src/lib/i18n.tsx");
  const { TooltipProvider } = await server.ssrLoadModule("/src/components/ui/tooltip.tsx");
  const { consumeQuestionDraft } = await server.ssrLoadModule("/src/lib/question-context.ts");
  const { extractConversationReports } = await server.ssrLoadModule("/src/lib/project-reports.ts");
  const { buildReportHtml } = await server.ssrLoadModule("/src/lib/report-html.ts");
  const noop = () => {};
  const render = (component, props) => renderToStaticMarkup(React.createElement(LocaleProvider, null, React.createElement(TooltipProvider, null, React.createElement(component, props))));
  const composer = React.createElement("textarea", { "aria-label": "manager-persistent-input", defaultValue: "" });
  const actions = { onSelectProject: noop, onNewProject: noop, onOpenConversation: noop, onNewConversation: noop,
    onCloseConversation: noop, onLogout: noop, onSwitchRole: noop, onUpdateFiles: noop, onOpenReport: noop,
    onViewSource: noop, onAsk: noop, onDraftTask: noop, onCloseReport: noop, onExportReport: noop };

  for (const userRole of ["investment-director", "committee-lead"]) {
    for (const projectStage of [undefined, "contact", "intake", "approved", "diligence", "decided", "signed", "funded", "post"]) {
      for (const compact of [false, true]) {
        const html = render(ChatComposer, { userRole, projectStage, compact, onSend: noop, onStop: noop, generating: false, initialDraft: "尚未发送的内容" });
        const expected = compact || userRole !== "investment-director" ? [] : projectStage === "diligence" ? ["财法分析"] : projectStage === "decided" ? ["投决纪要", "交割条件"] : [];
        for (const label of ["财法分析", "投决纪要", "交割条件"]) {
          const tag = html.match(new RegExp(`<button[^>]*>${label}</button>`))?.[0];
          assert.equal(Boolean(tag), expected.includes(label), `${userRole}/${projectStage}/${compact}: ${label}`);
          if (tag) assert.ok(!tag.includes('disabled=""') && tag.includes('type="button"'), "New shortcuts remain visually available");
        }
        assert.ok(html.includes("尚未发送的内容"));
        if (!compact && userRole === "investment-director") {
          for (const label of ["交叉验证", "生成报告"]) {
            const tag = html.match(new RegExp(`<button[^>]*>${label}</button>`))?.[0];
            assert.ok(tag && !tag.includes('disabled=""'), "Existing shortcuts remain enabled");
          }
          assert.equal(html.includes(">模拟投委会</button>"), projectStage !== "decided");
        }
      }
    }
  }

  for (const project of restoreProjectWorkflow(mockProjects)) {
    const shared = { ...actions, project, projects: [project], conversations: [], reports: [], currentConversationId: null, conversationOpen: false, assistantContent: null, composerContent: composer };
    const early = ["contact", "intake", "approved"].includes(project.lifecycleStage);
    for (const role of ["investment-director", "committee-lead"]) {
      const html = render(CommitteeWorkspace, { ...shared, role });
      if (early) {
        assert.ok(!html.includes('id="ic-overview-questions-title"') && !html.includes('id="manager-current-report-title"'), `${project.id}/${role}: early stages have no current focus or current report`);
      } else {
        assert.equal(html.includes('id="manager-current-report-title"'), role === "investment-director" || project.lifecycleStage === "decided");
      }
      assert.equal((html.match(/aria-label="manager-persistent-input"/g) ?? []).length, 1);
    }
  }
  const diligenceProjects = mockProjects.map((project) => ({ ...project, lifecycleStage: "diligence", currentLifecycleStage: "diligence", decision: undefined }));
  for (const project of diligenceProjects) {
    const shared = { ...actions, project, projects: mockProjects, conversations: [], reports: [], currentConversationId: null,
      conversationOpen: false, assistantContent: React.createElement("p", null, "conversation-message"), composerContent: composer };
    const manager = render(CommitteeWorkspace, { ...shared, role: "investment-director" });
    const committee = render(CommitteeWorkspace, { ...shared, role: "committee-lead" });
    for (const [html, targetRole] of [[manager, "投委会委员"], [committee, "投资经理"]]) {
      assert.match(html, new RegExp(`class="ic-shell-account-menu"><button[^>]*>${targetRole}</button>`), "Role menu uses the role name only");
      assert.ok(html.includes('data-slot="avatar"') && html.includes('data-slot="avatar-fallback"'), "Both roles share the photo-avatar primitive with a load-failure fallback");
    }
    for (const label of ["项目主页", "项目资料", "分析报告", "融资阶段", "当前状态", "项目与市场"]) {
      assert.ok(manager.includes(label) && committee.includes(label), `${project.id}: shared expression ${label}`);
    }
    assert.ok(manager.includes("当前关注") && !committee.includes("当前关注"), `${project.id}: current focus is manager-only`);
    assert.ok(manager.includes('id="manager-current-report-title">当前报告'));
    assert.equal((manager.match(/aria-label="manager-persistent-input"/g) ?? []).length, 1);
    assert.equal((committee.match(/aria-label="manager-persistent-input"/g) ?? []).length, 1, "Both roles share one mounted composer");
    const committeeComposer = committee.match(/<div[^>]*id="project-floating-composer"[^>]*>/)?.[0] ?? "";
    const managerComposer = manager.match(/<div[^>]*id="project-floating-composer"[^>]*>/)?.[0] ?? "";
    assert.ok(committeeComposer.includes('hidden=""') && committeeComposer.includes('inert=""') && committeeComposer.includes('aria-hidden="true"') && !committee.includes("manager-current-report-title"));
    assert.ok(managerComposer && !managerComposer.includes('hidden=""') && !managerComposer.includes('inert=""'));
    assert.ok(manager.indexOf("manager-current-report-title") < manager.indexOf('id="ic-overview-questions-title"'));
    const stage = render(ProjectStageTrack, { project });
    assert.ok(stage.includes('aria-expanded="false"') && /class="ic-stage-reveal"[^>]*aria-hidden="true"[^>]*inert=""/.test(stage), "Stage overview stays mounted for its closing animation, but is hidden and inert by default");
    assert.ok(stage.includes('class="ic-stage-steps"') && stage.includes('tabindex="-1"') && stage.includes('data-icon="right"'));
    const conversation = render(CommitteeWorkspace, { ...shared, role: "investment-director", conversationOpen: true });
    assert.ok(conversation.includes("conversation-message") && conversation.includes("manager-persistent-input"));
    const composed = render(CommitteeWorkspace, { ...shared, role: "investment-director", composerContent: (toolbarActions) => React.createElement(ChatComposer, {
      userRole: "investment-director", onSend: noop, onStop: noop, generating: false, initialDraft: "", toolbarActions, className: "manager-composer",
    }) });
    const floatingComposer = composed.slice(composed.indexOf('class="ic-manager-composer-inner"'), composed.indexOf('class="composer-launcher-position"'));
    assert.ok(floatingComposer.includes("交叉验证") && floatingComposer.includes("生成报告") && floatingComposer.includes("模拟投委会") && floatingComposer.includes('aria-label="收起输入框"'));
    assert.ok(floatingComposer.includes('data-icon="down"') && floatingComposer.includes('title="收起输入框"'));
    assert.ok(!floatingComposer.includes("历史对话") && composed.includes('data-icon="history"'), "History lives in the sidebar only");
    assert.ok(!floatingComposer.includes("项目助手") && !floatingComposer.includes("新对话") && !floatingComposer.includes("ic-manager-composer-toolbar"));
    assert.equal((floatingComposer.match(/class="composer-controls /g) ?? []).length, 1, "Collapse and task shortcuts share one row");

    const candidates = getCurrentReportCandidates(project);
    assert.ok(candidates.every((file) => file.category === "投决议案"));
    const draft = createManagerReportDraft(project);
    const panel = render(ManagerReportPanel, { ...actions, project, draft, onDraftChange: noop, onOpenKnowledge: noop });
    assert.ok(panel.includes("历史版本") && !/<button[^>]*>项目资料/.test(panel), "Current report keeps versions, not a duplicate materials entry");
    assert.ok(!panel.includes("报告要求") && !panel.includes("manager-report-requirements"));
    assert.ok(!panel.includes(">提交新报告</button>") && !panel.includes(">生成报告") && !panel.includes(">模拟投委会</button>"), "Report panel keeps reading actions only");
    if (panel.includes("manager-report-evidence-toggle")) {
      assert.ok(panel.includes("报告依据") && !panel.includes("收起依据") && !panel.includes("查看依据"));
      assert.match(panel, /class="manager-report-evidence-panel" data-expanded="true" aria-hidden="false"/);
      assert.doesNotMatch(panel, /class="manager-report-evidence-panel"[^>]*inert=""/);
    }
    if (candidates.length) assert.ok(panel.includes(candidates[0].name));
    else assert.ok(panel.includes("尚未指定投资报告"));
    assert.ok(!panel.includes("资料有更新"));
    const updatedProject = { ...project, files: [...project.files, { id: "new-file", name: "补充资料.pdf", size: "1MB", category: "其他", status: "indexed", kind: "pdf" }] };
    assert.notEqual(getMaterialSignature(updatedProject), draft.materialSignature);
    const updated = render(ManagerReportPanel, { ...actions, project: updatedProject, draft, onDraftChange: noop, onOpenKnowledge: noop });
    if (candidates.length) assert.ok(updated.includes("需重新复核"));
    assert.ok(!updated.includes("项目资料有更新"), "Material-change details belong to the separate project-level section");
    const removed = render(ManagerReportPanel, { ...actions, project: { ...project, files: [] }, draft, onDraftChange: noop, onOpenKnowledge: noop });
    assert.ok(removed.includes("尚未指定投资报告"));

    for (const kind of ["fact-check", "investment-report", "challenge"]) {
      const blocks = buildManagerTaskResult(project, kind, "请保留原始要求 <script>alert(1)</script>");
      assert.deepEqual(blocks.map((block) => block.kind), ["text", "project-work-report"]);
      const report = blocks[1];
      assert.equal(report.taskKind, kind);
      assert.ok(report.title.includes(project.name) && report.title.includes(managerTaskLabels[kind]));
      assert.ok(report.summary && !report.summary.includes("未进行新增核验"), "Summary contains project findings, not a supplemental demo explanation");
      const allowed = getCommitteeBrief(project).questions.flatMap((question) => question.sources);
      assert.ok(report.citations.every((source) => allowed.some((candidate) => JSON.stringify(candidate) === JSON.stringify(source))));
      const questions = getCoreQuestions(getCommitteeBrief(project));
      assert.ok(questions.every((question) => report.sections.some((section) => section.id === question.id)));
      assert.ok(!JSON.stringify(blocks).includes("曜矩"));
      const content = render(ReportContent, { block: report, onViewSource: noop });
      assert.ok(content.includes("本次要求"));
      const html = buildReportHtml(report);
      assert.ok(html.includes("&lt;script&gt;") && !html.includes("<script>alert(1)</script>"));
      const extracted = extractConversationReports(project.id, [{ id: "c", projectId: project.id, title: "任务", createdAt: "2026-09-07", updatedAt: "2026-09-07", messages: [{ id: "m", role: "assistant", createdAt: "2026-09-07", blocks }] }]);
      assert.equal(extracted.length, 1);
      assert.equal(extracted[0].block.taskKind, kind);
      const reader = render(CommitteeWorkspace, { ...shared, role: "investment-director", openReport: report });
      assert.ok(reader.includes("ic-manager-report-reader") && reader.includes("manager-persistent-input") && reader.includes(managerTaskLabels[kind]));
      assert.equal(buildManagerTaskProcess(project, kind).phases.length, 3);
    }
  }
  assert.equal(mockProjects.filter((project) => getCurrentReportCandidates(project).length).length, 4);
  for (const [query, expected] of [
    ["交叉验证：核对投资报告中的质询", "fact-check"], ["生成投资报告：需要模拟投委会质询和交叉验证结果", "investment-report"],
    ["模拟投委会：检查生成的投资报告", "challenge"], ["@投资分析 评估质询", "investment-report"],
    ["@交叉验证 审核投资报告", "fact-check"], ["请帮我看看", "ambiguous"],
  ]) assert.equal(getManagerTaskIntent(query), expected);

  const files = [{ name: "未发送附件.pdf", size: "2MB", kind: "pdf" }];
  const choice = buildManagerTaskChoice("", files);
  assert.deepEqual(choice.options.map((option) => option.mode), ["fact-check", "investment-report", "challenge"]);
  assert.equal(choice.attachments, files);
  assert.ok(render(ModePickCard, { ...choice, onPick: noop }).includes("生成报告"));
  const draft = { id: "draft", projectId: mockProjects[0].id, isDraft: true, title: "新对话", draftText: "", draftAttachments: files, messages: [], createdAt: "2026-09-07", updatedAt: "2026-09-07" };
  assert.ok(hasVisibleConversation(draft));
  assert.ok(conversationHistoryTitle(draft).includes(files[0].name));
  assert.ok(render(ConversationHistory, { conversations: [draft], currentId: null, onOpen: noop, onDelete: noop }).includes(files[0].name));
  const sent = { ...draft, messages: [{ role: "user", attachments: files, text: "核验附件" }] };
  const [consumed] = consumeQuestionDraft([sent], draft.id);
  assert.deepEqual(consumed.draftAttachments, []);
  assert.equal(consumed.messages[0].attachments, files);
  assert.equal(sent.draftAttachments, files);
  const composeProps = { onSend: noop, onStop: noop, userRole: "investment-director", generating: false, allowProjectMaterials: true, allowQueueWhileGenerating: true };
  const ready = render(ChatComposer, { ...composeProps, initialDraft: "@投资分析", initialAttachments: [] });
  assert.doesNotMatch(ready, /<button[^>]*disabled=""[^>]*aria-label="发送"/);
  assert.ok(ready.includes("生成报告") && ready.includes("交叉验证") && ready.includes("模拟投委会"));
  const restored = render(ChatComposer, { ...composeProps, initialDraft: "保留的要求", initialAttachments: files });
  assert.ok(restored.includes("未发送附件.pdf") && restored.includes("保留的要求</textarea>"));
  const busy = render(ChatComposer, { ...composeProps, generating: true, initialDraft: "下一个任务" });
  assert.ok(busy.includes('aria-label="发送"'));

  // State-boundary wiring guards supplement SSR; these do not replace browser interaction tests.
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(app.includes("nextPrompt.userRole") && app.includes("userRole: authSession?.role"));
  assert.ok(app.includes('const managerTask = userRole === "investment-director"'));
  assert.ok(app.includes("consumeConversationDraft(currentConversationId);\n    activateConversation();"));
  assert.ok(app.includes('currentConversationId={authSession?.role === "investment-director" ? null'));
  assert.match(app, /onCloseConversation=\{\(startFresh\) => \{\s*setView\("project-home"\);\s*if \(startFresh\) \{\s*setCurrentConversationId\(null\);\s*setManagerReferenceFile\(null\);/);
  const shell = await readFile(new URL("../src/components/project/CommitteeWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(shell.includes('isManager ? "/avatars/investment-manager.png" : "/avatars/committee-member.png"'));
  assert.ok(shell.includes('<Avatar key={role}') && !shell.includes('isManager ? "经" : "委"'), "Role changes reset the image instead of retaining another role's portrait");
  const portraits = await Promise.all(["investment-manager", "committee-member"].map((name) => readFile(new URL(`../public/avatars/${name}.png`, import.meta.url))));
  for (const portrait of portraits) assert.equal(portrait.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "Avatar is a bundled PNG, not a remote placeholder");
  assert.ok(!portraits[0].equals(portraits[1]), "Each role has a distinct portrait");
  assert.ok(shell.includes('onCloseConversation(next === "overview" || next === "projects")'), "Returning home starts fresh; checking materials can retain an in-progress draft");
  console.log("PASS: 6 projects × 2 shared-role shells; persistent manager composer on home/conversation/report; original report binding and material-change reminders; 18 project-bound outputs with export/citations; draft attachments; 3 task modes; queue role snapshot and navigation wiring.");
} finally { await server.close(); }
