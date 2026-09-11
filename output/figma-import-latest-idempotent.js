/**
 * Idempotent Figma plugin script for syncing the latest foresight captures.
 *
 * This is intentionally separate from `figma-import-latest.js`. It only
 * creates or updates layers carrying this script's marker, so existing
 * editable layers and small image fills such as logos are never replaced.
 */

const CAPTURE_ROOT = "http://localhost:3004/output/figma-captures";
const CAPTURE_MARKER = "[codex-latest-capture]";

const TARGETS = [
  { id: "89:2", file: "01-login-latest.png", label: "前瞻版 · 01 登录与准入", frameName: "01 登录 · 前瞻版" },
  { id: "91:2", file: "02-project-conversations-latest.png", label: "前瞻版 · 02 项目主页", frameName: "02 项目主页 · 历史对话" },
  { id: "92:2", file: "03-project-reports-latest.png", label: "前瞻版 · 03 历史报告", frameName: "03 项目主页 · 历史报告" },
  { id: "93:2", file: "04-project-knowledge-latest.png", label: "前瞻版 · 04 项目知识库", frameName: "04 项目主页 · 知识库" },
  { id: "94:2", file: "05-new-project-latest.png", label: "前瞻版 · 05 新建项目", frameName: "05 新建投决项目" },
  { id: "95:2", file: "06-framework-comparison-latest.png", label: "前瞻版 · 06 框架对照", frameName: "06 对话 · 交叉验证思考框架" },
  { id: "96:2", file: "07-fact-validation-latest.png", label: "前瞻版 · 07 事实交叉验证", frameName: "07 对话 · 事实交叉验证" },
  { id: "97:2", file: "08-challenge-latest.png", label: "前瞻版 · 08 挑战质询", frameName: "08 对话 · 挑战质询" },
  { id: "90:2", file: "09-investment-analysis-latest.png", label: "前瞻版 · 09 投资分析报告", frameName: "09 对话 · 投资分析独立复核" },
];

function hasChildren(node) {
  return node && Array.isArray(node.children);
}

function imagePaintIndex(node) {
  if (!node || !Array.isArray(node.fills)) return -1;
  return node.fills.findIndex((paint) => paint && paint.type === "IMAGE");
}

function overlayName(target) {
  return `${CAPTURE_MARKER} ${target.label}`;
}

function findGeneratedOverlays(frame) {
  if (!hasChildren(frame)) return [];
  return frame.children.filter(
    (node) =>
      node.type === "RECTANGLE" &&
      String(node.name || "").startsWith(CAPTURE_MARKER),
  );
}

function updateImageFill(layer, imageHash) {
  const index = imagePaintIndex(layer);
  const fills = Array.isArray(layer.fills) ? Array.from(layer.fills) : [];
  const paint = {
    type: "IMAGE",
    imageHash,
    scaleMode: "FILL",
  };

  if (index >= 0) fills[index] = paint;
  else fills.push(paint);

  layer.fills = fills;
}

function fitOverlayToFrame(overlay, frame) {
  overlay.resize(frame.width, frame.height);
  overlay.x = 0;
  overlay.y = 0;
  overlay.rotation = 0;
  overlay.opacity = 1;
  overlay.visible = true;
  overlay.locked = true;
}

async function getTargetFrame(target) {
  const frame = await figma.getNodeByIdAsync(target.id);
  if (!frame) throw new Error(`${target.label}: node ${target.id} not found`);
  if (target.frameName && frame.name !== target.frameName) {
    throw new Error(`${target.label}: expected frame ${target.frameName}, found ${frame.name}`);
  }
  if (!hasChildren(frame) || typeof frame.appendChild !== "function") {
    throw new Error(`${target.label}: node ${target.id} cannot accept children`);
  }
  return frame;
}

async function syncTarget(target) {
  const frame = await getTargetFrame(target);
  const image = await figma.createImageAsync(`${CAPTURE_ROOT}/${target.file}`);
  const overlays = findGeneratedOverlays(frame);
  let overlay = overlays.find((node) => node.name === overlayName(target));

  if (!overlay) {
    overlay = figma.createRectangle();
    overlay.name = overlayName(target);
    frame.appendChild(overlay);
  }

  updateImageFill(overlay, image.hash);
  fitOverlayToFrame(overlay, frame);
  frame.appendChild(overlay);
  if ("layoutPositioning" in overlay && "layoutMode" in frame && frame.layoutMode !== "NONE") {
    overlay.layoutPositioning = "ABSOLUTE";
    fitOverlayToFrame(overlay, frame);
  }

  for (const duplicate of overlays) {
    if (duplicate.id === overlay.id) continue;
    duplicate.visible = false;
    duplicate.locked = true;
  }

  return {
    targetId: frame.id,
    overlayId: overlay.id,
    label: target.label,
    mode: overlays.length ? "updated" : "inserted",
    hiddenDuplicates: overlays.filter((node) => node.id !== overlay.id).map((node) => node.id),
  };
}

async function run() {
  const designPage = figma.root.children.find(
    (page) => page.name.toLowerCase() === "design" || page.id === "79:2",
  );
  if (!designPage) throw new Error("Page `design` (79:2) not found");
  await figma.setCurrentPageAsync(designPage);

  const results = [];
  for (const target of TARGETS) {
    try {
      results.push(await syncTarget(target));
    } catch (error) {
      results.push({
        targetId: target.id,
        label: target.label,
        mode: "error",
        error: String(error && error.message ? error.message : error),
      });
    }
  }

  const successful = results.filter((item) => item.mode !== "error");
  figma.currentPage.selection = successful
    .map((item) => figma.getNodeById(item.overlayId))
    .filter(Boolean);
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);

  return {
    createdOrUpdatedNodeIds: successful.map((item) => item.overlayId),
    mutatedTargetNodeIds: successful.map((item) => item.targetId),
    updated: results.filter((item) => item.mode === "updated").length,
    inserted: results.filter((item) => item.mode === "inserted").length,
    failed: results.filter((item) => item.mode === "error").length,
    results,
  };
}

run()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error) => console.error(error));
