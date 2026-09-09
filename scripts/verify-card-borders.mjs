import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const rule = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `Missing rule: ${selector}`);
  return match[1];
};

const decision = await read("src/components/project/decision-workspace.css");
const manager = await read("src/components/project/manager-workspace.css");
const reasoning = await read("src/components/project/question-reasoning.css");
for (const [css, selector] of [
  [decision, ".decision-baseline-card"],
  [manager, ".manager-report-update"],
  [reasoning, ".ic-reasoning-card"],
  [reasoning, ".ic-reasoning-path"],
]) {
  const declarations = rule(css, selector);
  assert.match(declarations, /border:\s*1px solid/, `${selector}: keep a uniform thin border`);
  assert.doesNotMatch(declarations, /border-(left|right|top|bottom|inline)/, `${selector}: no side accent`);
}
assert.doesNotMatch(rule(reasoning, ".ic-reasoning-signal"), /border-/);
assert.doesNotMatch(reasoning, /border-top:\s*3px|border-top-color:/);

const styles = await read("src/index.css");
assert.doesNotMatch(styles, /box-shadow:\s*inset 2px 0 0/);
for (const file of ["VerificationCard", "FactVerificationCard", "ValidationWorkspaceDrawer"]) {
  const source = await read(`src/components/chat/${file}.tsx`);
  assert.doesNotMatch(source, /border-l-2|w-\[3px\]|indicatorBar/, `${file}: no decorative side strip`);
}
const exportedReport = await read("src/lib/report-html.ts");
assert.doesNotMatch(exportedReport, /\.vcard-claim::before/);
assert.match(rule(exportedReport, ".vcard-claim"), /padding:\s*14px 16px;/);

// Diagram connectors, column separators and keyboard focus are not accent cards.
assert.match(rule(reasoning, ".ic-reasoning-branch:not(:last-child)::after"), /border-left:\s*1px/);
assert.match(rule(reasoning, ".ic-reasoning-branch:not(:last-child)::after"), /height:\s*calc\(100% \+ var\(--ic-branch-gap\)\)/);
assert.doesNotMatch(reasoning, /\.ic-reasoning-branches::before|\.ic-reasoning-branch::after\s*\{/);
assert.match(rule(reasoning, ".ic-reasoning-fork::after"), /top:\s*calc\(var\(--ic-branch-anchor\) - 1px\)/, "Account for the fork card's border");
// Geometry contract, not a browser layout test: only B→C and C→D have vertical segments.
const gap = Number(rule(reasoning, ".ic-reasoning-tree").match(/--ic-branch-gap:\s*(\d+)px/)[1]);
const anchor = Number(rule(reasoning, ".ic-reasoning-tree").match(/--ic-branch-anchor:\s*(\d+)px/)[1]);
for (let mask = 0; mask < 8; mask++) {
  const heights = [128, 145, 139].map((height, index) => height + ((mask >> index) & 1 ? 320 : 0));
  const tops = [0, heights[0] + gap, heights[0] + heights[1] + gap * 2];
  const segmentEnds = [0, 1].map((index) => tops[index] + anchor + heights[index] + gap);
  assert.deepEqual(segmentEnds, [tops[1] + anchor, tops[2] + anchor]);
  assert.ok(segmentEnds.every((end) => end <= tops[2] + anchor), "No continuation below D's entry when any branches expand");
}
assert.match(rule(styles, ".demo-claim-connector::after"), /border-left:\s*4px solid currentColor/);
assert.match(rule(exportedReport, ".vcard-claim"), /border-right:\s*1px/);
assert.match(decision, /:focus-visible[^{}]*\{\s*outline:\s*2px/);

console.log("Card border contracts passed: uniform card borders; connectors and focus retained.");
