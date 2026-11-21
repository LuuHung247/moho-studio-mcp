/** A front-facing cartoon humanoid skeleton, parameterised by scale/position. */

import type { BoneSpec } from "./skeleton.js";

const HALF_PI = Math.PI / 2;

export interface HumanoidOptions {
  /** Uniform scale. 1 = about 1.3 units tall, which fits a 2-unit-tall frame. */
  scale?: number;
  /** World position of the hip bone's start. */
  x?: number;
  y?: number;
}

/**
 * Directions (global): up = +PI/2. The character faces the viewer, so the
 * character's left side (_L) is on the +x (screen right) side.
 */
export function humanoidBones(options: HumanoidOptions = {}): BoneSpec[] {
  const s = options.scale ?? 1;
  const x = options.x ?? 0;
  const y = options.y ?? -0.05;

  const arm = (side: "L" | "R"): BoneSpec[] => {
    const out = side === "L" ? -HALF_PI : HALF_PI; // spine up -> outward
    const down = side === "L" ? -HALF_PI : HALF_PI; // outward -> down
    return [
      { name: `shoulder_${side}`, parent: "spine", length: 0.12 * s, angle: out },
      { name: `upper_arm_${side}`, parent: `shoulder_${side}`, length: 0.22 * s, angle: down },
      { name: `forearm_${side}`, parent: `upper_arm_${side}`, length: 0.2 * s, angle: 0 },
      { name: `hand_${side}`, parent: `forearm_${side}`, length: 0.08 * s, angle: 0 },
    ];
  };

  const leg = (side: "L" | "R"): BoneSpec[] => {
    const out = side === "L" ? -HALF_PI : HALF_PI; // hip up -> outward
    const down = side === "L" ? -HALF_PI : HALF_PI; // outward -> down
    const toe = side === "L" ? HALF_PI : -HALF_PI; // down -> outward
    return [
      { name: `hip_${side}`, parent: "hip", length: 0.07 * s, angle: out, attach: "start" },
      { name: `thigh_${side}`, parent: `hip_${side}`, length: 0.3 * s, angle: down },
      { name: `shin_${side}`, parent: `thigh_${side}`, length: 0.3 * s, angle: 0 },
      { name: `foot_${side}`, parent: `shin_${side}`, length: 0.1 * s, angle: toe },
    ];
  };

  return [
    { name: "hip", length: 0.1 * s, angle: HALF_PI, x, y },
    { name: "spine", parent: "hip", length: 0.3 * s, angle: 0 },
    { name: "neck", parent: "spine", length: 0.08 * s, angle: 0 },
    { name: "head", parent: "neck", length: 0.22 * s, angle: 0 },
    ...arm("L"),
    ...arm("R"),
    ...leg("L"),
    ...leg("R"),
  ];
}
