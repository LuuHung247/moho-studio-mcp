// Generates docs/tool-reference.md and schema/tools.json from the real tool
// registrations, so the documentation can never drift from the code.
// Usage: npm run build && npm run docs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { registerTools } from "../dist/tools/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tools = [];

const server = {
  tool(name, description, shape, _handler) {
    const params = Object.entries(shape).map(([key, schema]) => ({
      name: key,
      required: !schema.isOptional(),
      type: schema._def.typeName.replace("Zod", "").toLowerCase(),
      description: schema.description ?? "",
    }));
    tools.push({ name, description, params });
  },
};
const noopClient = { isConnected: () => true, connect: async () => {}, sendRequest: async () => ({}) };
registerTools(server, noopClient);

const groups = [
  ["System & project", /^(system|project|document|render)_/],
  ["Drawing", /^draw_/],
  ["Layers & scene", /^(layer|switch|image|particle)_/],
  ["Rigging", /^(rig|bone)_/],
  ["Mesh", /^mesh_/],
  ["Animation", /^(anim|animation)_/],
  ["Interaction", /^(input|batch)_/],
];

const lines = ["# Tool reference", "", `Generated from the code — ${tools.length} tools. Do not edit by hand (\`npm run docs\`).`, ""];
const seen = new Set();
for (const [title, re] of groups) {
  const members = tools.filter((t) => re.test(t.name) && !seen.has(t.name));
  if (!members.length) continue;
  lines.push(`## ${title}`, "");
  for (const t of members) {
    seen.add(t.name);
    lines.push(`### \`${t.name}\``, "", t.description, "");
    if (t.params.length) {
      lines.push("| Parameter | Type | Required | Description |", "|---|---|---|---|");
      for (const p of t.params) lines.push(`| \`${p.name}\` | ${p.type} | ${p.required ? "yes" : ""} | ${p.description.replace(/\|/g, "\\|")} |`);
      lines.push("");
    }
  }
}
const rest = tools.filter((t) => !seen.has(t.name));
if (rest.length) throw new Error(`Ungrouped tools: ${rest.map((t) => t.name).join(", ")}`);

fs.writeFileSync(path.join(root, "docs/tool-reference.md"), lines.join("\n"));
fs.writeFileSync(path.join(root, "schema/tools.json"), JSON.stringify({ count: tools.length, tools }, null, 2));
console.log(`Wrote ${tools.length} tools`);
