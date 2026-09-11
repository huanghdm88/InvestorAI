/**
 * Figma plugin main-code draft.
 *
 * Updates the existing foresight canvases in the `design` page with the
 * latest 1920x1080 captures. Existing frame names, positions, and editable
 * children are preserved. If a frame has an image layer, only that layer's
 * image paint is replaced; otherwise a locked capture layer is inserted at
 * the top of the frame for manual review. The original editable layers
 * remain underneath and are never removed.
 */

const CAPTURE_ROOT =
  "http://localhost:3004/output/figma-captures";

const TARGETS = [
  { id: "89:2", file: "01-login-latest.png", label: "前瞻版 · 01 登录与准入" },
  { id: "91:2", file: "02-project-conversations-latest.png", label: "前瞻版 · 02 项目主页" },
  { id: "92:2", file: "03-project-reports-latest.png", label: "前瞻版 · 03 历史报告" },
  { id: "93:2", file: "04-project-knowledge-latest.png", label: "前瞻版 · 04 项目知识库" },
  { id: "94:2", file: "05-new-project-latest.png", label: "前瞻版 · 05 新建项目" },
  { id: "95:2", file: "06-framework-comparison-latest.png", label: "前瞻版 · 06 框架对照" },
  { id: "96:2", file: "07-fact-validation-latest.png", label: "前瞻版 · 07 事实交叉验证" },
  { id: "97:2", file: "08-challenge-latest.png", label: "前瞻版 · 08 挑战质询" },
  { id: "90:2", file: "09-investment-analysis-latest.png", label: "前瞻版 · 09 投资分析报告" },
];

function hasChildren(node) {
  return node && Array.isArray(node.children);
}

function walk(node, result = []) {
  result.push(node);
  if (hasChildren(node)) {
    for (const child of node.children) walk(child, result);
  }
  return result;
}

function imagePaintIndex(node) {
  if (!node || !Array.isArray(node.fills)) return -1;
  return node.fills.findIndex((paint) => paint && paint.type === "IMAGE");
}

function chooseImageLayer(frame) {
  const nodes = walk(frame);
  return (
    nodes.find((node) => {
      const name = String(node.name || "").toLowerCase();
      return imagePaintIndex(node) >= 0 &&
        (name.includes("capture") || name.includes("screenshot") || name.includes("最新"));
    }) || null
  );
}

async function loadImage(url) {
  // createImageAsync handles the network request inside the plugin sandbox.
  return figma.createImageAsync(url);
}

async function updateTarget(target) {
  const frame = figma.getNodeById(target.id);
  if (!frame) throw new Error(`${target.label}: node ${target.id} not found`);
  const image = await loadImage(`${CAPTURE_ROOT}/${target.file}`);
  const layer = chooseImageLayer(frame);

  if (layer) {
    const index = imagePaintIndex(layer);
    const fills = Array.from(layer.fills);
    fills[index] = {
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode: "FILL",
    };
    layer.fills = fills;
    return { label: target.label, mode: "updated", nodeId: layer.id, nodeName: layer.name };
  }

  if (!hasChildren(frame) || typeof frame.insertChild !== "function") {
    throw new Error(`${target.label}: no editable image layer and frame cannot accept children`);
  }

  const capture = figma.createRectangle();
  capture.name = `${target.label} · latest capture overlay (review)`;
  capture.resize(frame.width, frame.height);
  capture.x = 0;
  capture.y = 0;
  capture.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
  capture.locked = true;
  frame.appendChild(capture);
  return { label: target.label, mode: "inserted", nodeId: capture.id, nodeName: capture.name };
}

async function run() {
  const designPage = figma.root.children.find((page) => page.name === "design");
  if (!designPage) throw new Error("Page `design` not found");
  await figma.setCurrentPageAsync(designPage);

  const results = [];
  for (const target of TARGETS) {
    try {
      results.push(await updateTarget(target));
    } catch (error) {
      results.push({ label: target.label, mode: "error", error: String(error.message || error) });
    }
  }

  const updated = results.filter((item) => item.mode === "updated").length;
  const inserted = results.filter((item) => item.mode === "inserted").length;
  const errors = results.filter((item) => item.mode === "error");
  const message = `前瞻版截图同步：更新 ${updated}，新增复核层 ${inserted}，失败 ${errors.length}`;
  return { message, results };
}

run()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error) => console.error(error));
