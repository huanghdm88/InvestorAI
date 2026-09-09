# 投资官AI General Edition

> 投资决策辅助 Agent General Edition Demo。**投委会委员**在上会前快速获取核心质询方向；**投资经理**围绕当前报告执行交叉验证、生成报告和模拟投委会。两种视角共用项目导航、信息模块与黑白视觉风格。

## 设计目标

- **数据确权 / 逻辑清晰**：所有结论必须带溯源锚点（文档名 + 页码 + 段落）
- **结构化卡片优先**：拒绝大段纯文本，事实对比、质询清单均以可视化卡片呈现
- **偏好驱动**：右侧偏好栏（投资阶段 / 风险容忍度 R1-R3 / 自定义指令）作为最高优先级注入 Prompt

## 本地运行

前置：Node.js 22.12+（当前环境使用 Node.js 24）

```bash
npm install
npm run dev
```

访问 http://localhost:3002

生产构建的本地预览：

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 3002
```

> 默认演示账号：任意邮箱 + 任意密码即可进入。

默认选择投委会委员。界面预览可使用 `/?autologin=1&role=committee-lead`；投资经理视图可使用 `/?autologin=1&role=investment-director`。这些是本地演示入口，并非真实身份认证。通用版独立发布地址：https://invest-wise-general.vercel.app。

## 主要页面

| 页面 | 说明 |
| --- | --- |
| `/login` | 邮箱+密码登录、找回密码入口 |
| 项目主页 | 企业与融资摘要 / 阶段记录 / 完整推演 / 默认展开的项目与市场；当前关注仅经理可见 |
| 项目资料与报告 | 左侧固定入口，保留当前项目上下文 |
| 项目助手 | 经理默认展开、委员按需打开；下方箭头收起为底部居中圆形入口，草稿保留；发送按钮统一圆形 |
| 投资经理工作台 | 当前报告与报告依据默认展开；任务从输入区发起；接触、入库和立项分别记录初筛、档案及尽调安排 |
| 投委会通知 | 进入尽调时生成站内通知，支持未读筛选、标读及直达项目当前阶段 |
| 项目管理 | 新建项目向导、知识库 Dropzone、文件解析状态 |

## 技术栈

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4（@theme inline 配置）
- Radix UI Primitives
- lucide-react 图标
- 视觉风格沿用 `UI_Stantard-main`（Notion 风格 / 圆角 0.875rem / Inter 字体）

委员主页采用黑白主题、细分隔线和列表式排版。当前简报来自已有演示材料，来源未确认的融资字段显示“待确认”；项目文件仍为前端演示数据，新增文件不会自动产生真实 AI 分析。

经理任务产物基于各项目已有材料快照，不代表对新增附件进行了真实核验。原报告全文预览、报告在线编辑、真实 AI 生成与后台持续核验尚未接入；当前报告选择和上传附件草稿在本次页面会话内保留。点击顶部当前状态可回看已完成阶段；当前早期阶段可编辑记录并逐步推进，历史回看不改变实际阶段。详细场景见 [项目阶段与角色场景](docs/project-lifecycle.md)。

投决阶段：极光智算默认进入明确标注的有条件通过情景，演示估值从原议案 12.6 亿元调整到 11.8 亿元；未明确的融资总额和我方投资不补造。其余项目没有正式决议时显示结果待确认。原材料与报告不改写；获批引用与后续补充报告分别保留。条件上传仅收取文件信息，提交复核不发送真实审批；“演示复核结果”仅模拟状态变化。经理暂不提醒不改变条件有效性。项目实际阶段、前期记录、决议处理和通知已读状态保存在当前浏览器；未接入跨用户消息服务。

阶段内容使用 GSAP 过渡，数字采用纵向滚动；支持减少动态效果偏好。任务的项目、阶段、角色及报告来源在提交时快照，排队、任务选择及等待解析后继续不会改用后来切换的阶段。

经理输入区为底部悬浮卡片，正文按输入区高度预留阅读空间。当前报告可查看实际原文件与生成/修订草稿的历史版本；交叉验证演示完成后出现待确认变更，可确认、忽略或撤销。确认保存独立修订记录，不改写 PDF，也不把缺失证据标为已核实。重复核验不重复列项；新材料的建议未经确认，不会覆盖此前采纳的表述。处置和修订记录仅在本次页面会话内保留。

## 回归检查

```bash
npm run lint
node scripts/verify-committee-contracts.mjs
node scripts/verify-manager-contracts.mjs
node scripts/verify-report-review-contracts.mjs
node scripts/verify-decision-contracts.mjs
node scripts/verify-early-stages.mjs
node scripts/verify-project-notifications.mjs
node scripts/verify-composer-motion.mjs
node scripts/verify-project-workspace.mjs
npm run build
```

脚本覆盖两种视角的服务端渲染、项目绑定、任务分类、引用和导出、草稿消费等契约，不替代浏览器交互测试。
