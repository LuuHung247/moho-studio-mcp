import { describe, expect, it } from "vitest";
import { humanoidBones } from "../recipes/humanoid.js";
import { planSkeleton } from "../recipes/skeleton.js";
import { resolveRoles, splitName } from "../recipes/roles.js";
import { locomotionOps, WALK_PRESET, type LocomotionParams } from "../recipes/locomotion.js";
import { oscillateOps, waveOps } from "../recipes/gestures.js";
import {
  blinkOps, blinkTimes, cameraMoveOps, cameraShakeOps, fadeOps, layerPathOps, lipSyncOps,
} from "../recipes/face-camera.js";
import type { BoneInfo } from "../recipes/types.js";

/** Pretend Moho assigned indices in creation order and echoed the rest pose. */
function rigFromPlan(origin: "start" | "tip" = "start"): BoneInfo[] {
  const specs = humanoidBones();
  const plan = planSkeleton(1, specs, 0, origin);
  return plan.operations.map((op, i) => ({
    id: i,
    name: op.params!.name as string,
    angle: op.params!.angle as number,
    position: { x: op.params!.posX as number, y: op.params!.posY as number },
    length: op.params!.length as number,
    parentId: op.params!.parentBoneId as number,
  }));
}

function baseWalk(overrides: Partial<LocomotionParams> = {}): LocomotionParams {
  return {
    layerId: 1, roles: resolveRoles(rigFromPlan()), startFrame: 1, cycles: 1, travel: 0, samplesPerCycle: 8,
    ...WALK_PRESET, ...overrides,
  };
}

describe("planSkeleton", () => {
  it("assigns indices in order and resolves parents by name", () => {
    const plan = planSkeleton(5, [
      { name: "a", length: 1, x: 2, y: 3 },
      { name: "b", parent: "a", length: 0.5 },
    ], 0, "start");
    expect(plan.indexByName).toEqual({ a: 0, b: 1 });
    expect(plan.operations[1]!.params).toMatchObject({ parentBoneId: 0, posX: 1, posY: 0 });
    expect(plan.operations[0]!.params).toMatchObject({ parentBoneId: -1, posX: 2, posY: 3 });
  });

  it("offsets indices when the skeleton already has bones", () => {
    const plan = planSkeleton(5, [{ name: "a", length: 1 }, { name: "b", parent: "a", length: 1 }], 4);
    expect(plan.indexByName).toEqual({ a: 4, b: 5 });
    expect(plan.operations[1]!.params!.parentBoneId).toBe(4);
  });

  it("supports both bone-origin conventions", () => {
    const spec = [{ name: "a", length: 2 }, { name: "b", parent: "a", length: 1 },
      { name: "c", parent: "a", length: 1, attach: "start" as const }];
    const start = planSkeleton(1, spec, 0, "start").operations;
    const tip = planSkeleton(1, spec, 0, "tip").operations;
    expect(start[1]!.params!.posX).toBe(2);
    expect(start[2]!.params!.posX).toBe(0);
    expect(tip[1]!.params!.posX).toBe(0);
    expect(tip[2]!.params!.posX).toBe(-2);
  });

  it.each([
    ["duplicate names", [{ name: "a", length: 1 }, { name: "a", length: 1 }], /Duplicate/],
    ["forward parent reference", [{ name: "b", parent: "a", length: 1 }, { name: "a", length: 1 }], /defined earlier/],
    ["non-positive length", [{ name: "a", length: 0 }], /positive length/],
  ])("rejects %s", (_label, spec, message) => {
    expect(() => planSkeleton(1, spec as never)).toThrow(message);
  });
});

describe("humanoid template", () => {
  const bones = humanoidBones();
  const names = bones.map((b) => b.name);

  it("is a valid skeleton with unique names", () => {
    expect(new Set(names).size).toBe(names.length);
    expect(() => planSkeleton(1, bones)).not.toThrow();
  });

  it("has a single root and 20 bones", () => {
    expect(bones.filter((b) => b.parent === undefined)).toHaveLength(1);
    expect(bones).toHaveLength(20);
  });

  it("scales lengths uniformly", () => {
    const big = humanoidBones({ scale: 2 });
    big.forEach((b, i) => expect(b.length).toBeCloseTo(bones[i]!.length * 2));
  });

  it("mirrors left and right arms", () => {
    const angle = (n: string) => bones.find((b) => b.name === n)!.angle!;
    expect(angle("shoulder_L")).toBeCloseTo(-angle("shoulder_R"));
    expect(angle("thigh_L")).toBeCloseTo(-angle("thigh_R"));
  });
});

describe("resolveRoles", () => {
  it("resolves every canonical humanoid name", () => {
    const roles = resolveRoles(rigFromPlan());
    expect(Object.keys(roles)).toHaveLength(20);
    expect(roles.thigh_L!.name).toBe("thigh_L");
  });

  it("understands common foreign naming", () => {
    const mk = (name: string, id: number): BoneInfo =>
      ({ id, name, angle: 0, position: { x: 0, y: 0 }, length: 1, parentId: -1 });
    const roles = resolveRoles([
      mk("Pelvis", 0), mk("LeftThigh", 1), mk("Thigh.R", 2), mk("l_forearm", 3), mk("Head", 4), mk("calf_r", 5),
    ]);
    expect(roles.hip!.id).toBe(0);
    expect(roles.thigh_L!.id).toBe(1);
    expect(roles.thigh_R!.id).toBe(2);
    expect(roles.forearm_L!.id).toBe(3);
    expect(roles.head!.id).toBe(4);
    expect(roles.shin_R!.id).toBe(5);
  });

  it("splits camelCase and separators", () => {
    expect(splitName("upperArmL")).toEqual(["upper", "arm", "l"]);
    expect(splitName("Thigh.R")).toEqual(["thigh", "r"]);
  });
});

describe("locomotionOps", () => {
  it("loops seamlessly: first and last key of every bone match", () => {
    const ops = locomotionOps(baseWalk());
    const byBone = new Map<number, number[]>();
    for (const op of ops) {
      const id = op.params!.boneId as number;
      const v = (op.params!.angle ?? op.params!.posY) as number;
      byBone.set(id, [...(byBone.get(id) ?? []), v]);
    }
    for (const [, values] of byBone) {
      expect(values[0]).toBeCloseTo(values[values.length - 1]!, 9);
    }
  });

  it("spans exactly cycles * frames", () => {
    const ops = locomotionOps(baseWalk({ cycles: 2, frames: 24, startFrame: 10 }));
    const frames = ops.map((o) => o.params!.frame as number);
    expect(Math.min(...frames)).toBe(10);
    expect(Math.max(...frames)).toBe(10 + 48);
  });

  it("swings opposite legs in opposite directions", () => {
    const rig = baseWalk();
    const ops = locomotionOps(baseWalk({ frames: 8 }));
    const quarter = ops.filter((o) => o.params!.frame === 1 + 2); // phase = PI/2
    const angleOf = (name: string) =>
      quarter.find((o) => o.params!.boneId === rig.roles[name as "thigh_L"]!.id)!.params!.angle as number;
    const restL = rig.roles.thigh_L!.angle;
    const restR = rig.roles.thigh_R!.angle;
    expect(angleOf("thigh_L") - restL).toBeCloseTo(WALK_PRESET.stride, 5);
    expect(angleOf("thigh_R") - restR).toBeCloseTo(-WALK_PRESET.stride, 5);
  });

  it("moves the hip forward by `travel` per cycle", () => {
    const rig = baseWalk({ travel: 2 });
    const ops = locomotionOps(rig);
    const hip = rig.roles.hip!;
    const xs = ops.filter((o) => o.params!.boneId === hip.id && o.params!.posX !== undefined).map((o) => o.params!.posX as number);
    expect(xs[xs.length - 1]! - xs[0]!).toBeCloseTo(2, 9);
  });

  it("only touches bones that exist (works on a legs-only rig)", () => {
    const legsOnly = rigFromPlan().filter((b) => /^(hip|thigh|shin|foot)/.test(b.name) && !b.name.startsWith("hip_"));
    const ops = locomotionOps(baseWalk({ roles: resolveRoles(legsOnly) }));
    const ids = new Set(ops.map((o) => o.params!.boneId));
    for (const id of ids) expect(legsOnly.some((b) => b.id === id)).toBe(true);
  });

  it("explains which bone is missing", () => {
    expect(() => locomotionOps(baseWalk({ roles: {} }))).toThrow(/role "hip"/);
  });

  it("validates its inputs", () => {
    expect(() => locomotionOps(baseWalk({ frames: 2 }))).toThrow(/frames/);
    expect(() => locomotionOps(baseWalk({ cycles: 0 }))).toThrow(/cycles/);
  });
});

describe("gestures", () => {
  const roles = resolveRoles(rigFromPlan());

  it("wave raises the arm in opposite directions for L and R", () => {
    const get = (side: "L" | "R") => {
      const ops = waveOps({ layerId: 1, roles, side, startFrame: 1, duration: 40, swings: 2, amplitude: 0.4 });
      const arm = roles[`upper_arm_${side}`]!;
      const raised = ops.filter((o) => o.params!.boneId === arm.id).map((o) => o.params!.angle as number);
      return { rest: arm.angle, peak: raised.reduce((a, b) => (Math.abs(b - arm.angle) > Math.abs(a - arm.angle) ? b : a)) };
    };
    expect(get("L").peak - get("L").rest).toBeGreaterThan(0);
    expect(get("R").peak - get("R").rest).toBeLessThan(0);
  });

  it("wave starts and ends at the rest pose", () => {
    const ops = waveOps({ layerId: 1, roles, side: "R", startFrame: 5, duration: 30, swings: 2, amplitude: 0.3 });
    const arm = roles.upper_arm_R!;
    const armKeys = ops.filter((o) => o.params!.boneId === arm.id);
    expect(armKeys[0]!.params!.angle).toBe(arm.angle);
    expect(armKeys[armKeys.length - 1]!.params!.angle).toBe(arm.angle);
  });

  it("oscillate returns to its start value after whole cycles", () => {
    const head = roles.head!;
    const ops = oscillateOps({ layerId: 1, bone: head, property: "angle", startFrame: 1, period: 24, cycles: 2, amplitude: 0.1 });
    const v = ops.map((o) => o.params!.angle as number);
    expect(v[0]).toBeCloseTo(head.angle);
    expect(v[v.length - 1]).toBeCloseTo(head.angle);
    expect(Math.max(...v) - head.angle).toBeCloseTo(0.1);
  });

  it("oscillate rejects bad periods", () => {
    expect(() => oscillateOps({ layerId: 1, bone: roles.head!, property: "angle", startFrame: 1, period: 1, cycles: 1, amplitude: 1 })).toThrow(/period/);
  });
});

describe("face and camera", () => {
  it("generated blinks are deterministic, inside the range and spaced", () => {
    const a = blinkTimes({ startFrame: 1, endFrame: 480, seed: 3 });
    const b = blinkTimes({ startFrame: 1, endFrame: 480, seed: 3 });
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(2);
    expect(a.every((t) => t >= 1 && t < 480)).toBe(true);
    for (let i = 1; i < a.length; i += 1) expect(a[i]! - a[i - 1]!).toBeGreaterThanOrEqual(24);
  });

  it("switch-mode blink opens, closes, reopens", () => {
    const ops = blinkOps({ startFrame: 1, endFrame: 10, at: [5], switchLayerId: 9, openChild: "open", closedChild: "closed", closedFor: 2 });
    expect(ops.map((o) => [o.params!.frame, o.params!.childName])).toEqual([[5, "open"], [6, "closed"], [8, "open"]]);
  });

  it("scale-mode blink squashes then restores every eye layer", () => {
    const ops = blinkOps({ startFrame: 1, endFrame: 10, at: [5], eyeLayerIds: [1, 2] });
    expect(ops).toHaveLength(8);
    expect(ops.filter((o) => o.params!.layerId === 2).map((o) => o.params!.scaleY)).toEqual([1, 0.05, 0.05, 1]);
  });

  it("blink requires exactly one mode", () => {
    expect(() => blinkOps({ startFrame: 1, endFrame: 5 })).toThrow(/exactly one/);
    expect(() => blinkOps({ startFrame: 1, endFrame: 5, switchLayerId: 1, eyeLayerIds: [2] })).toThrow(/exactly one/);
    expect(() => blinkOps({ startFrame: 1, endFrame: 5, switchLayerId: 1 })).toThrow(/openChild/);
  });

  it("lip sync sorts cues by frame", () => {
    const ops = lipSyncOps(4, [{ frame: 30, mouth: "O" }, { frame: 10, mouth: "AI" }]);
    expect(ops.map((o) => o.params!.frame)).toEqual([10, 30]);
    expect(() => lipSyncOps(4, [])).toThrow();
  });

  it("fade writes opacity at both ends for each layer", () => {
    const ops = fadeOps([1, 2], 0, 1, 10, 20);
    expect(ops).toHaveLength(4);
    expect(() => fadeOps([1], 0, 1, 20, 20)).toThrow();
  });

  it("layer path only emits supplied components and sorts keys", () => {
    const ops = layerPathOps(7, [{ frame: 20, x: 2 }, { frame: 1, x: 0, y: 1, scale: 2 }]);
    expect(ops[0]!.params).toEqual({ layerId: 7, frame: 1, transX: 0, transY: 1, scaleX: 2, scaleY: 2 });
    expect(ops[1]!.params).toEqual({ layerId: 7, frame: 20, transX: 2 });
  });

  it("camera move writes start and end keys, with optional hold", () => {
    const ops = cameraMoveOps({ startFrame: 1, endFrame: 48, from: { zoom: 1 }, to: { zoom: 1.4, x: 0.5 }, holdFrames: 12 });
    expect(ops.map((o) => o.params!.frame)).toEqual([1, 48, 60]);
    expect(ops[1]!.params).toMatchObject({ zoom: 1.4, posX: 0.5 });
  });

  it("camera shake ends exactly on the base position", () => {
    const ops = cameraShakeOps({ startFrame: 10, endFrame: 20, amplitude: 0.05, base: { x: 1, y: 2 } });
    expect(ops[ops.length - 1]!.params).toMatchObject({ frame: 20, posX: 1, posY: 2 });
    for (const o of ops.slice(0, -1)) {
      expect(Math.abs((o.params!.posX as number) - 1)).toBeLessThanOrEqual(0.05);
    }
  });
});
