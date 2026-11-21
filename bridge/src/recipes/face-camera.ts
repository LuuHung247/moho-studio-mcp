/** Blinks, lip-sync, fades, layer paths and camera moves. */

import { seededRandom, type Operation } from "./types.js";

// ---- blink --------------------------------------------------------------

export interface BlinkParams {
  startFrame: number;
  endFrame: number;
  /** Explicit blink start frames. When omitted, blinks are generated. */
  at?: number[];
  /** Average frames between generated blinks. */
  interval?: number;
  seed?: number;
  /** Frames the eyes stay closed. */
  closedFor?: number;
  /** Switch-layer mode. */
  switchLayerId?: number;
  openChild?: string;
  closedChild?: string;
  /** Scale mode: eye layers squashed vertically. */
  eyeLayerIds?: number[];
}

const DEFAULT_BLINK_INTERVAL = 72;
const MIN_BLINK_GAP = 24;
const BLINK_SQUASH = 0.05;

export function blinkTimes(p: BlinkParams): number[] {
  if (p.at) return [...p.at].sort((a, b) => a - b);
  const rand = seededRandom(p.seed ?? 1);
  const interval = p.interval ?? DEFAULT_BLINK_INTERVAL;
  const times: number[] = [];
  let t = p.startFrame + Math.round(interval * (0.5 + rand()));
  while (t < p.endFrame) {
    times.push(t);
    t += Math.max(MIN_BLINK_GAP, Math.round(interval * (0.6 + rand() * 0.8)));
  }
  return times;
}

export function blinkOps(p: BlinkParams): Operation[] {
  const hasSwitch = p.switchLayerId !== undefined;
  const hasScale = (p.eyeLayerIds?.length ?? 0) > 0;
  if (hasSwitch === hasScale) {
    throw new Error("Provide exactly one of: switchLayerId (+ openChild/closedChild) or eyeLayerIds");
  }
  if (hasSwitch && (!p.openChild || !p.closedChild)) {
    throw new Error("switch mode needs openChild and closedChild names");
  }

  const closedFor = Math.max(1, p.closedFor ?? 3);
  const ops: Operation[] = [];

  for (const t of blinkTimes(p)) {
    if (hasSwitch) {
      ops.push(
        { method: "switch.setActive", params: { layerId: p.switchLayerId, frame: t, childName: p.openChild } },
        { method: "switch.setActive", params: { layerId: p.switchLayerId, frame: t + 1, childName: p.closedChild } },
        { method: "switch.setActive", params: { layerId: p.switchLayerId, frame: t + 1 + closedFor, childName: p.openChild } },
      );
    } else {
      for (const id of p.eyeLayerIds ?? []) {
        ops.push(
          { method: "layer.setTransform", params: { layerId: id, frame: t, scaleY: 1 } },
          { method: "layer.setTransform", params: { layerId: id, frame: t + 1, scaleY: BLINK_SQUASH } },
          { method: "layer.setTransform", params: { layerId: id, frame: t + 1 + closedFor, scaleY: BLINK_SQUASH } },
          { method: "layer.setTransform", params: { layerId: id, frame: t + 2 + closedFor, scaleY: 1 } },
        );
      }
    }
  }
  return ops;
}

// ---- lip sync ------------------------------------------------------------

export interface MouthCue {
  frame: number;
  mouth: string;
}

export function lipSyncOps(switchLayerId: number, cues: readonly MouthCue[]): Operation[] {
  if (cues.length === 0) throw new Error("cues must not be empty");
  return [...cues]
    .sort((a, b) => a.frame - b.frame)
    .map((c) => ({
      method: "switch.setActive",
      params: { layerId: switchLayerId, frame: c.frame, childName: c.mouth },
    }));
}

// ---- fade / layer path -------------------------------------------------------

export function fadeOps(layerIds: readonly number[], from: number, to: number, startFrame: number, endFrame: number): Operation[] {
  if (endFrame <= startFrame) throw new Error("endFrame must be after startFrame");
  return layerIds.flatMap((layerId) => [
    { method: "layer.setOpacity", params: { layerId, frame: startFrame, opacity: from } },
    { method: "layer.setOpacity", params: { layerId, frame: endFrame, opacity: to } },
  ]);
}

export interface PathKey {
  frame: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
}

export function layerPathOps(layerId: number, keys: readonly PathKey[]): Operation[] {
  if (keys.length < 2) throw new Error("A path needs at least 2 keys");
  return [...keys]
    .sort((a, b) => a.frame - b.frame)
    .map((k) => ({
      method: "layer.setTransform",
      params: {
        layerId,
        frame: k.frame,
        ...(k.x !== undefined ? { transX: k.x } : {}),
        ...(k.y !== undefined ? { transY: k.y } : {}),
        ...(k.rotation !== undefined ? { rotation: k.rotation } : {}),
        ...(k.scale !== undefined ? { scaleX: k.scale, scaleY: k.scale } : {}),
      },
    }));
}

// ---- camera ---------------------------------------------------------------------

export interface CameraPose {
  x?: number;
  y?: number;
  zoom?: number;
  roll?: number;
}

export interface CameraMoveParams {
  startFrame: number;
  endFrame: number;
  from: CameraPose;
  to: CameraPose;
  /** Hold the final pose this many extra frames (adds a closing key). */
  holdFrames?: number;
}

function cameraKey(frame: number, pose: CameraPose): Operation {
  return {
    method: "document.setCamera",
    params: {
      frame,
      ...(pose.x !== undefined ? { posX: pose.x } : {}),
      ...(pose.y !== undefined ? { posY: pose.y } : {}),
      ...(pose.zoom !== undefined ? { zoom: pose.zoom } : {}),
      ...(pose.roll !== undefined ? { roll: pose.roll } : {}),
    },
  };
}

export function cameraMoveOps(p: CameraMoveParams): Operation[] {
  if (p.endFrame <= p.startFrame) throw new Error("endFrame must be after startFrame");
  const ops = [cameraKey(p.startFrame, p.from), cameraKey(p.endFrame, p.to)];
  if (p.holdFrames && p.holdFrames > 0) ops.push(cameraKey(p.endFrame + p.holdFrames, p.to));
  return ops;
}

export interface CameraShakeParams {
  startFrame: number;
  endFrame: number;
  /** Peak offset in layer units. */
  amplitude: number;
  /** Frames between random targets. */
  interval?: number;
  seed?: number;
  base?: { x: number; y: number };
}

/** Handheld/impact shake; the last key returns to the base position. */
export function cameraShakeOps(p: CameraShakeParams): Operation[] {
  if (p.endFrame <= p.startFrame) throw new Error("endFrame must be after startFrame");
  const rand = seededRandom(p.seed ?? 7);
  const step = Math.max(1, p.interval ?? 2);
  const base = p.base ?? { x: 0, y: 0 };
  const ops: Operation[] = [];
  for (let f = p.startFrame; f < p.endFrame; f += step) {
    ops.push(cameraKey(f, {
      x: base.x + (rand() * 2 - 1) * p.amplitude,
      y: base.y + (rand() * 2 - 1) * p.amplitude,
    }));
  }
  ops.push(cameraKey(p.endFrame, { x: base.x, y: base.y }));
  return ops;
}
