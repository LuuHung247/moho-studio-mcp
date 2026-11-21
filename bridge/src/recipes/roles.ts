/** Map arbitrary bone names onto canonical humanoid roles. */

import type { BoneInfo, Role, RoleMap, Side } from "./types.js";

const BASE_ALIASES: Record<string, string[]> = {
  hip: ["hip", "hips", "pelvis", "root"],
  spine: ["spine", "chest", "torso", "body", "waist"],
  neck: ["neck"],
  head: ["head"],
  shoulder: ["shoulder", "clavicle"],
  upper_arm: ["upperarm", "arm", "bicep"],
  forearm: ["forearm", "lowerarm", "elbow"],
  hand: ["hand", "wrist"],
  hip_side: ["hip", "pelvis"],
  thigh: ["thigh", "upleg", "upperleg", "leg"],
  shin: ["shin", "calf", "lowerleg", "knee"],
  foot: ["foot", "ankle"],
};

const SIDED = new Set(["shoulder", "upper_arm", "forearm", "hand", "hip_side", "thigh", "shin", "foot"]);

export function splitName(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function detectSide(tokens: string[]): Side | null {
  if (tokens.includes("l") || tokens.includes("left")) return "L";
  if (tokens.includes("r") || tokens.includes("right")) return "R";
  return null;
}

function baseOf(tokens: string[]): string {
  return tokens.filter((t) => !["l", "r", "left", "right"].includes(t)).join("");
}

/** Canonical names always win; aliases are a fallback for foreign rigs. */
export function resolveRoles(bones: readonly BoneInfo[]): RoleMap {
  const roles: RoleMap = {};
  const canonical = new Set<string>();

  for (const b of bones) canonical.add(b.name);
  for (const b of bones) {
    if (canonical.has(b.name) && isRoleName(b.name)) roles[b.name] = b;
  }

  for (const b of bones) {
    const tokens = splitName(b.name);
    const side = detectSide(tokens);
    const base = baseOf(tokens);
    for (const [baseRole, aliases] of Object.entries(BASE_ALIASES)) {
      if (!aliases.includes(base)) continue;
      const sided = SIDED.has(baseRole);
      if (sided && !side) continue;
      if (!sided && side) continue;
      const roleName = sided ? `${baseRole === "hip_side" ? "hip" : baseRole}_${side}` : baseRole;
      if (isRoleName(roleName) && !roles[roleName]) {
        roles[roleName] = b;
      }
      break;
    }
  }
  return roles;
}

const ROLE_NAMES = new Set<string>([
  "hip", "spine", "neck", "head",
  "shoulder_L", "shoulder_R", "upper_arm_L", "upper_arm_R",
  "forearm_L", "forearm_R", "hand_L", "hand_R",
  "hip_L", "hip_R", "thigh_L", "thigh_R",
  "shin_L", "shin_R", "foot_L", "foot_R",
]);

export function isRoleName(name: string): name is Role {
  return ROLE_NAMES.has(name);
}
