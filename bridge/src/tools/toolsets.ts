/**
 * Toolsets: expose only the tool groups an agent needs.
 * Every tool definition is sent to the model on every session (~16k tokens for
 * all 87), so a worker sub-agent that only animates should not pay for drawing,
 * export and GUI-automation tools. Select with MOHO_MCP_TOOLSET, e.g.
 *   MOHO_MCP_TOOLSET=anim            (preset)
 *   MOHO_MCP_TOOLSET=core,render     (preset + group prefix)
 * A tool's group is the part of its name before the first underscore.
 */

export const GROUPS = [
  "system", "document", "layer", "project", "batch", "draw", "mesh", "image", "switch",
  "particle", "bone", "rig", "animation", "anim", "render", "input",
] as const;

const CORE = ["system", "document", "layer", "project", "batch"];

export const PRESETS: Record<string, readonly string[]> = {
  full: GROUPS,
  core: CORE,
  art: [...CORE, "draw", "mesh", "image", "switch", "particle"],
  rig: [...CORE, "bone", "rig", "animation"],
  anim: [...CORE, "bone", "anim", "animation", "switch"],
  film: ["system", "document", "project", "render"],
};

export function parseToolset(value: string | undefined): ReadonlySet<string> {
  if (!value || value.trim() === "") return new Set(GROUPS);
  const selected = new Set<string>();
  const unknown: string[] = [];
  for (const raw of value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)) {
    const preset = PRESETS[raw];
    if (preset) preset.forEach((g) => selected.add(g));
    else if ((GROUPS as readonly string[]).includes(raw)) selected.add(raw);
    else unknown.push(raw);
  }
  if (unknown.length > 0) {
    throw new Error(
      `Unknown MOHO_MCP_TOOLSET entries: ${unknown.join(", ")}. ` +
        `Presets: ${Object.keys(PRESETS).join(", ")}. Groups: ${GROUPS.join(", ")}.`,
    );
  }
  // The screenshot is how every worker verifies its work; never hide it.
  selected.add("system");
  return selected;
}

export function groupOf(toolName: string): string {
  return toolName.split("_")[0] ?? toolName;
}

export function isAllowed(toolName: string, toolset: ReadonlySet<string>): boolean {
  return toolset.has(groupOf(toolName));
}
