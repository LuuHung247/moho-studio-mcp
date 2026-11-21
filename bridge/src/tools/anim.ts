/** Animation recipe tools: each compiles to batched keyframe operations. */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MohoClient } from "../moho-client.js";
import { oscillateOps, waveOps } from "../recipes/gestures.js";
import {
  blinkOps, cameraMoveOps, cameraShakeOps, fadeOps, layerPathOps, lipSyncOps,
} from "../recipes/face-camera.js";
import { locomotionOps, RUN_PRESET, WALK_PRESET } from "../recipes/locomotion.js";
import { resolveRoles } from "../recipes/roles.js";
import type { Operation } from "../recipes/types.js";
import { runBatch } from "../tooling/batch.js";
import { defineCustomTool } from "../tooling/define.js";
import { successContent } from "../tooling/results.js";
import { fetchBones } from "./rig.js";
import { LIMITS } from "./schema.js";

async function runRecipe(client: MohoClient, name: string, ops: Operation[]) {
  const summary = await runBatch(client, ops);
  return successContent({ recipe: name, keyframeOperations: ops.length, ...summary });
}

const rigShape = {
  layerId: z.number().int().describe("Bone layer ID"),
  startFrame: z.number().default(1),
};

const locomotionShape = {
  ...rigShape,
  cycles: z.number().min(1).default(2).describe("Number of full cycles (2 steps each)"),
  frames: z.number().min(4).optional().describe("Frames per cycle"),
  travel: z.number().optional().describe("Hip X travel per cycle (0 = in place)"),
  intensity: z.number().min(0.1).max(3).optional().describe("Multiplier on swing, bounce and lean (default 1)"),
};

export function registerAnimTools(server: McpServer, client: MohoClient): void {
  for (const [kind, preset] of [["walk", WALK_PRESET], ["run", RUN_PRESET]] as const) {
    defineCustomTool(server, {
      name: `anim_${kind}Cycle`,
      description:
        `Animate a ${kind} cycle on a humanoid rig (bones are found by name — rig_buildHumanoid names them correctly). ` +
        "Keys are placed so the cycle loops seamlessly; Moho smooths between them. Character faces +x (right).",
      shape: locomotionShape,
      handler: async ({ layerId, startFrame, cycles, frames, travel, intensity }) => {
        const roles = resolveRoles(await fetchBones(client, layerId));
        const k = intensity ?? 1;
        const ops = locomotionOps({
          layerId, roles, startFrame, cycles,
          frames: frames ?? preset.frames,
          stride: preset.stride * k, armSwing: preset.armSwing * k, kneeBend: preset.kneeBend * k,
          bounce: preset.bounce * k, lean: preset.lean * k,
          travel: travel ?? 0, samplesPerCycle: 8,
        });
        return runRecipe(client, `${kind}Cycle`, ops);
      },
    });
  }

  defineCustomTool(server, {
    name: "anim_wave",
    description: "Raise an arm, wave the forearm, lower it (greeting). Side L = character's left (screen right).",
    shape: {
      ...rigShape,
      side: z.enum(["L", "R"]).default("R"),
      duration: z.number().min(10).default(48).describe("Total frames of the gesture"),
      swings: z.number().min(1).default(3),
      amplitude: z.number().default(0.5).describe("Forearm swing in radians"),
    },
    handler: async ({ layerId, startFrame, side, duration, swings, amplitude }) => {
      const roles = resolveRoles(await fetchBones(client, layerId));
      return runRecipe(client, "wave", waveOps({ layerId, roles, side, startFrame, duration, swings, amplitude }));
    },
  });

  defineCustomTool(server, {
    name: "anim_oscillate",
    description:
      "Sine-wave one bone property around its rest value: breathing (spine scale), nodding (head angle), tail wag, floating (posY), swinging pendulum. The loop returns to its start value.",
    shape: {
      ...rigShape,
      boneId: z.number().int(),
      property: z.enum(["angle", "posX", "posY", "scale"]),
      amplitude: z.number(),
      period: z.number().min(4).describe("Frames per oscillation"),
      cycles: z.number().positive().default(2),
      phase: z.number().optional().describe("Radians"),
    },
    handler: async ({ layerId, startFrame, boneId, property, amplitude, period, cycles, phase }) => {
      const bone = (await fetchBones(client, layerId)).find((b) => b.id === boneId);
      if (!bone) throw new Error(`Bone ${boneId} not found in layer ${layerId}`);
      return runRecipe(client, "oscillate",
        oscillateOps({ layerId, bone, property, startFrame, period, cycles, amplitude, phase }));
    },
  });

  defineCustomTool(server, {
    name: "anim_blink",
    description:
      "Add natural, irregular blinking over a frame range. Either drive a SWITCH layer (switchLayerId + openChild + closedChild names) or squash eye layers vertically (eyeLayerIds). Pass `at` for exact frames; otherwise blinks are generated deterministically from `seed`.",
    shape: {
      startFrame: z.number().default(1),
      endFrame: z.number(),
      at: z.array(z.number()).max(LIMITS.keys).optional(),
      interval: z.number().optional().describe("Average frames between blinks (default 72)"),
      seed: z.number().optional(),
      closedFor: z.number().optional().describe("Frames eyes stay closed (default 3)"),
      switchLayerId: z.number().int().optional(),
      openChild: z.string().optional(),
      closedChild: z.string().optional(),
      eyeLayerIds: z.array(z.number().int()).max(LIMITS.layerIds).optional(),
    },
    handler: async (args) => runRecipe(client, "blink", blinkOps(args)),
  });

  defineCustomTool(server, {
    name: "anim_lipSync",
    description:
      "Set mouth shapes over time on a switch layer. cues = [{frame, mouth}] where mouth is the child layer name (e.g. rest, AI, E, O, U, MBP, FV, L, etc.). Derive cue frames from the dialogue timing: frame = seconds * fps.",
    shape: {
      switchLayerId: z.number().int(),
      cues: z.array(z.object({ frame: z.number(), mouth: z.string() })).min(1).max(1000),
    },
    handler: async ({ switchLayerId, cues }) => runRecipe(client, "lipSync", lipSyncOps(switchLayerId, cues)),
  });

  defineCustomTool(server, {
    name: "anim_layerPath",
    description:
      "Move/rotate/scale a layer through keyframes in one call: keys = [{frame, x?, y?, rotation?, scale?}]. For props, whole characters sliding across the scene, bouncing balls, floating clouds.",
    shape: {
      layerId: z.number().int(),
      keys: z.array(z.object({
        frame: z.number(), x: z.number().optional(), y: z.number().optional(),
        rotation: z.number().optional(), scale: z.number().optional(),
      })).min(2).max(500),
    },
    handler: async ({ layerId, keys }) => runRecipe(client, "layerPath", layerPathOps(layerId, keys)),
  });

  defineCustomTool(server, {
    name: "anim_fade",
    description: "Fade layers in or out (opacity from -> to over a frame range). Use 0 -> 1 to fade in, 1 -> 0 to fade out.",
    shape: {
      layerIds: z.array(z.number().int()).min(1).max(LIMITS.layerIds),
      from: z.number().min(0).max(1),
      to: z.number().min(0).max(1),
      startFrame: z.number(),
      endFrame: z.number(),
    },
    handler: async ({ layerIds, from, to, startFrame, endFrame }) =>
      runRecipe(client, "fade", fadeOps(layerIds, from, to, startFrame, endFrame)),
  });

  const pose = z.object({ x: z.number().optional(), y: z.number().optional(), zoom: z.number().optional(), roll: z.number().optional() });

  defineCustomTool(server, {
    name: "anim_cameraMove",
    description:
      "Camera move between two poses: pan (x/y), push-in / pull-out (zoom), roll. Examples: push-in = zoom 1 -> 1.4; pan right = x 0 -> 1.",
    shape: {
      startFrame: z.number(), endFrame: z.number(), from: pose, to: pose,
      holdFrames: z.number().optional(),
    },
    handler: async (args) => runRecipe(client, "cameraMove", cameraMoveOps(args)),
  });

  defineCustomTool(server, {
    name: "anim_cameraShake",
    description: "Camera shake for impacts, explosions or handheld feel; returns to the base position at endFrame.",
    shape: {
      startFrame: z.number(), endFrame: z.number(),
      amplitude: z.number().positive().describe("Peak offset in layer units (0.02 subtle, 0.1 violent)"),
      interval: z.number().optional(), seed: z.number().optional(),
      base: z.object({ x: z.number(), y: z.number() }).optional(),
    },
    handler: async (args) => runRecipe(client, "cameraShake", cameraShakeOps(args)),
  });
}
