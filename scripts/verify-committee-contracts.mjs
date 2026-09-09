import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { getProjectIdentity } = await server.ssrLoadModule("/src/lib/project-identity.ts");
  const { mockProjects } = await server.ssrLoadModule("/src/data/mock-projects.ts");
  const { mockConversations } = await server.ssrLoadModule("/src/data/mock-conversations.ts");
  const { getCommitteeAnalysisQuestions, getCommitteeAnalysisQuestionContext } = await server.ssrLoadModule("/src/data/committee-analysis-questions.ts");
  const { getCommitteeBrief } = await server.ssrLoadModule("/src/data/committee-briefs.ts");
  const { buildQuestionFollowUp, buildQuestionResult, buildQuestionProcess, consumeQuestionDraft } = await server.ssrLoadModule("/src/lib/question-context.ts");
  const { getQuestionPathModel } = await server.ssrLoadModule("/src/data/question-paths.ts");
  const { getProjectMarketContent } = await server.ssrLoadModule("/src/components/project/ProjectMarketPanel.tsx");
  const { QuestionReasoningBody } = await server.ssrLoadModule("/src/components/project/QuestionReasoningDialog.tsx");
  const { QuestionContextCard } = await server.ssrLoadModule("/src/components/chat/QuestionContextCard.tsx");
  const { QuestionReportCard } = await server.ssrLoadModule("/src/components/chat/QuestionReportCard.tsx");
  const { buildReportHtml } = await server.ssrLoadModule("/src/lib/report-html.ts");
  const { extractConversationReports } = await server.ssrLoadModule("/src/lib/project-reports.ts");
  const { ChatComposer } = await server.ssrLoadModule("/src/components/chat/ChatComposer.tsx");
  const { CommitteeOverview } = await server.ssrLoadModule("/src/components/project/CommitteeOverview.tsx");
  const { CommitteeAnalysisQuestions } = await server.ssrLoadModule("/src/components/project/CommitteeAnalysisQuestions.tsx");
  const { LocaleProvider } = await server.ssrLoadModule("/src/lib/i18n.tsx");
  const render = (component, props) => renderToStaticMarkup(React.createElement(LocaleProvider, null, React.createElement(component, props)));
  const noop = () => {};
  const diligenceProjects = mockProjects.map((project) => ({ ...project, lifecycleStage: "diligence", currentLifecycleStage: "diligence", decision: undefined }));
  const rounds = ["Pre-A 轮", "B 轮", "D 轮", "B 轮", "A+ 轮", "Pre-A 轮"];
  diligenceProjects.forEach((project, index) => {
    const identity = getProjectIdentity(project);
    assert.equal(identity.round, rounds[index]);
    const html = render(CommitteeOverview, {project, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop});
    assert.ok(html.includes("融资阶段") && html.includes(identity.round));
    assert.ok(html.includes("当前状态") && html.includes(identity.status));
    assert.ok(html.includes('id="ic-overview-questions-title">当前关注</h2>'));
    const committeeHtml = render(CommitteeOverview, { project, showCurrentFocus: false, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop });
    assert.ok(!committeeHtml.includes('id="ic-overview-questions-title"') && !committeeHtml.includes("ic-overview-other"), "Committee hides current focus and its archived concerns");
    assert.ok(committeeHtml.includes("ic-project-market"), "Hiding focus preserves project and market information");
    assert.match(html, /<details class="ic-project-market"[^>]*open=""/);
    assert.ok(html.indexOf("ic-project-market") > html.indexOf("ic-overview-questions-title"));
    const brief = getCommitteeBrief(project);
    if (brief.questions.length) assert.ok(html.includes("的推演过程") && !html.includes("完整推演"));
    const {metrics, market} = getProjectMarketContent(project, brief);
    assert.ok(market.length > 0);
    for (const metric of metrics) {
      if (/[0-9]/.test(metric.value)) assert.ok(metric.source?.excerpt, `${metric.label} must have a source`);
    }
    brief.questions.forEach((question) => {
      const context = {projectId: project.id, projectName: project.name, questionId: question.id, ...question};
      const model = getQuestionPathModel(context);
      assert.equal(model.paths.length, 3);
      assert.equal(new Set(model.paths.map((path) => path.title)).size, 3);
      assert.notEqual(model.premise, "先区分已知材料、待核实判断与条件假设，不把缺失证据视作已经通过。", `${question.id} needs its own model`);
      const detail = render(QuestionReasoningBody, {context, onViewSource: noop});
      assert.equal((detail.match(/class="ic-reasoning-branch"/g) ?? []).length, 3, "Each details card gets a stable connector wrapper");
      assert.ok(detail.includes(model.fork) && detail.includes("事实分析") && detail.includes("本次采用前提"));
      assert.ok(!detail.includes("推演假设，非已确认事实"), "Keep the premise, remove the repetitive disclaimer");
      model.paths.forEach((path) => assert.ok(detail.includes(path.title) && detail.includes(path.action)));
      const results = buildQuestionResult("需要补充什么证据？", context);
      assert.deepEqual(results.map((block) => block.kind), ["text", "question-report"]);
      assert.ok(results[0].text.includes(question.neededEvidence));
      assert.deepEqual(results[1].citations, question.sources);
      const card = render(QuestionReportCard, {block: results[1], onViewSource: noop});
      assert.ok(card.includes("会话结论") && card.includes(question.question));
      const exported = buildReportHtml(results[1]);
      assert.ok(exported.includes("会话结论") && exported.includes(question.question));
      assert.equal(buildQuestionProcess(context).phases.length, 4);
    });
  });
  for (const project of mockProjects.filter((item) => ["contact", "intake", "approved"].includes(item.lifecycleStage))) {
    for (const showCurrentFocus of [false, true]) {
      const html = render(CommitteeOverview, { project, showCurrentFocus, onViewSource: noop, onAsk: noop, onOpenKnowledge: noop });
      assert.ok(!html.includes('id="ic-overview-questions-title"') && !html.includes('id="manager-current-report-title"'), "Early views do not display diligence focus or reports");
    }
  }
  for (const project of diligenceProjects) {
    const reports = extractConversationReports(project.id, mockConversations);
    const questions = getCommitteeAnalysisQuestions(project, reports);
    const panel = render(CommitteeAnalysisQuestions, { project, reports, onOpenReport: noop, onViewSource: noop, onAsk: noop, onOpenReasoning: noop });
    assert.equal((panel.match(/class="ic-analysis-question-controls"/g) ?? []).length, questions.length, "Every question has visible reasoning and evidence actions");
    assert.equal((panel.match(/data-expanded="false" aria-hidden="true" inert=""/g) ?? []).length, questions.length, "Collapsed evidence is excluded from keyboard and assistive navigation");
    assert.ok(!panel.includes("查看关联关注"), "No question links to the hidden current focus section");
    for (const question of questions) {
      const context = getCommitteeAnalysisQuestionContext(project, question);
      assert.equal(context.questionId, question.id, "Analysis reasoning keeps its own identity instead of borrowing a related focus model");
      assert.equal(context.context, question.conclusion);
      assert.equal(context.thesis, question.thesis);
      assert.equal(context.impact, question.impact);
      assert.equal(context.neededEvidence, question.neededEvidence);
      assert.deepEqual(context.sources, question.sources);
      assert.notEqual(context.sources[0], question.sources[0], "Question context retains a separate source snapshot");
      const model = getQuestionPathModel(context);
      assert.equal(model.fork, question.question, "Conditional branches address this question");
      assert.equal(model.paths.length, 3);
      const body = render(QuestionReasoningBody, { context, onViewSource: noop });
      for (const text of [question.conclusion, question.thesis, question.impact, question.neededEvidence]) assert.ok(body.includes(text));
      assert.ok(panel.includes(`查看“${question.question}”的推演过程`) && panel.includes(`“${question.question}”的项目依据`));
      assert.ok(!panel.includes("收起依据") && !panel.includes(">查看依据"));
    }
  }
  assert.equal(getProjectIdentity({...mockProjects[0], lifecycleStage: "signed"}).status, "已签协议");
  assert.equal(getProjectIdentity({...mockProjects[0], name: "未知项目", financingRound: undefined, lifecycleStage: undefined, status: "parsed"}).status, "待确认");
  assert.equal(getProjectIdentity({...mockProjects[0], name: "未知项目", financingRound: undefined}).round, "待确认");
  const project = diligenceProjects.find((item) => item.id === "proj-aurora");
  const question = getCommitteeBrief(project).questions[0];
  const context = {projectId: project.id, projectName: project.name, questionId: question.id, ...question};
  const baseProps = {generating: false, onSend: noop, onStop: noop, compact: true, userRole: "committee-lead"};
  const empty = render(ChatComposer, {...baseProps, questionContext: context, onRemoveQuestionContext: noop, initialDraft: ""});
  assert.match(empty, /<textarea[^>]*><\/textarea>/);
  assert.ok(empty.includes("移除质询附件") && empty.includes(question.question));
  assert.match(empty, /<button[^>]*disabled=""[^>]*aria-label="发送"/);
  const prompt = "请解释现金流调节差额";
  const ready = render(ChatComposer, {...baseProps, questionContext: context, initialDraft: prompt});
  assert.ok(ready.includes(`>${prompt}</textarea>`));
  assert.doesNotMatch(ready, /<button[^>]*disabled=""[^>]*aria-label="发送"/);
  const removed = render(ChatComposer, {...baseProps, initialDraft: prompt});
  assert.ok(!removed.includes("question-context-card") && removed.includes(`>${prompt}</textarea>`));
  const taskInput = buildQuestionFollowUp(prompt, context);
  assert.ok(taskInput.includes(question.question) && taskInput.endsWith(prompt));
  question.sources.forEach((source) => assert.ok(taskInput.includes(source.excerpt)));
  assert.equal(buildQuestionFollowUp(prompt), prompt);
  const refCard = render(QuestionContextCard, {context});
  assert.ok(refCard.includes("当前关注"));
  assert.ok(!refCard.includes("paper-clip"));
  const sentMessage = {id: "sent", role: "user", text: prompt, questionContext: context, createdAt: "2026-09-07"};
  const original = {id: "draft-a", projectId: project.id, title: "当前追问", draftText: prompt, questionContext: context,
    messages: [sentMessage], createdAt: "2026-09-07", updatedAt: "2026-09-07"};
  const untouched = {...original, id: "draft-b", draftText: "另一个草稿", messages: []};
  const consumed = consumeQuestionDraft([original, untouched], "draft-a");
  assert.equal(consumed[0].draftText, "");
  assert.equal(consumed[0].questionContext, undefined);
  assert.equal(consumed[0].messages[0].questionContext, context);
  assert.equal(consumed[1], untouched);
  assert.equal(original.draftText, prompt);
  assert.equal(original.questionContext, context);
  const nextComposer = render(ChatComposer, {...baseProps, initialDraft: consumed[0].draftText, questionContext: consumed[0].questionContext});
  assert.match(nextComposer, /<textarea[^>]*><\/textarea>/);
  assert.ok(!nextComposer.includes("question-context-card"));
  const results = buildQuestionResult("对估值有什么影响？", context);
  const reports = extractConversationReports(project.id, [{...consumed[0], messages: [...consumed[0].messages, {id: "reply", role: "assistant", createdAt: "2026-09-07", blocks: results}]}]);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].block.kind, "question-report");
  const escaped = buildReportHtml({...results[1], query: '<script>alert("x")</script>'});
  assert.ok(escaped.includes("&lt;script&gt;") && !escaped.includes('<script>alert("x")</script>'));
  const svg = await readFile(new URL("../public/brand/investor-ai-mark.svg", import.meta.url), "utf8");
  assert.ok(svg.includes("linearGradient") && svg.includes('stroke="#ffffff"'));
  console.log("PASS: 6 diligence views; early-stage focus/report isolation; expanded market; 12 source-bound reasoning models; independent analysis contexts; fixed evidence labels; consumed drafts and report rendering/export/history.");
} finally {
  await server.close();
}
