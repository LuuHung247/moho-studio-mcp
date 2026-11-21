/** Rigging tools: build skeletons, attach art, smart bones. */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MohoClient } from "../moho-client.js";
import { humanoidBones } from "../recipes/humanoid.js";
import { planSkeleton, type BoneSpec } from "../recipes/skeleton.js";
import type { BoneInfo } from "../recipes/types.js";
import { runBatch, type Operation } from "../tooling/batch.js";
import { callMoho, defineCustomTool } from "../tooling/define.js";
import { successContent } from "../tooling/results.js";

/** layer.getBones returns a bare array; tolerate {bones: []} as well. */
export async function fetchBones(client: MohoClient, layerId: number): Promise<BoneInfo[]> {
  const raw = (await callMoho(client, "layer.getBones", { layerId })) as unknown;
  const list = Array.isArray(raw) ? raw : (raw as { bones?: unknown[] } | null)?.bones;
  if (!Array.isArray(list)) throw new Error(`layer.getBones returned an unexpected shape for layer ${layerId}`);
  return list as BoneInfo[];
}

async function createBoneLayer(client: MohoClient, name: string, parentId?: number): Promise<number> {
  const r = (await callMoho(client, "layer.createLayer", {
    type: "bone", name, ...(parentId !== undefined ? { parentId } : {}),
  })) as { layerId?: number };
  if (typeof r.layerId !== "number" || r.layerId < 0) throw new Error("Could not create the bone layer");
  return r.layerId;
}

async function buildSkeleton(
  client: MohoClient, layerId: number, bones: readonly BoneSpec[],
) {
  const existing = (await fetchBones(client, layerId)).length;
  const plan = planSkeleton(layerId, bones, existing);
  const summary = await runBatch(client, plan.operations, { stopOnError: true });
  if (summary.failed > 0) {
    throw new Error(`Skeleton build failed: ${JSON.stringify(summary.errors)}`);
  }
  return { layerId, bones: plan.indexByName, created: summary.succeeded };
}

const boneSpecSchema = z.object({
  name: z.string().min(1),
  parent: z.string().optional().describe("Name of an EARLIER bone in this list"),
  length: z.number().positive(),
  angle: z.number().optional().describe("Radians. Root: world angle (PI/2 = up). Child: relative to parent."),
  x: z.number().optional().describe("Root bones only: world position"),
  y: z.number().optional(),
  attach: z.enum(["tip", "start"]).optional().describe("Child bones: attach at parent's tip (default) or start"),
});

export function registerRigTools(server: McpServer, client: MohoClient): void {
  defineCustomTool(server, {
    name: "rig_buildSkeleton",
    description:
      "Build a whole skeleton in one call from a list of named bones (parents must come before children). Creates the bone layer unless layerId is given. Returns bone name -> bone index, which the other rig_/anim_ tools and bone_setTransform use.",
    shape: {
      layerId: z.number().int().optional().describe("Existing bone layer; omitted = create a new one"),
      layerName: z.string().optional(),
      parentId: z.number().int().optional().describe("Group to create the bone layer in"),
      bones: z.array(boneSpecSchema).min(1).max(100),
    },
    handler: async ({ layerId, layerName, parentId, bones }) => {
      const id = layerId ?? (await createBoneLayer(client, layerName ?? "Rig", parentId));
      return successContent(await buildSkeleton(client, id, bones));
    },
  });

  defineCustomTool(server, {
    name: "rig_buildHumanoid",
    description:
      "Create a ready-made front-facing humanoid skeleton (hip, spine, neck, head, shoulders, arms, hands, legs, feet) named so anim_walkCycle / anim_wave work immediately. Character's left (_L) is on the screen's right. ALWAYS verify with document_screenshot(mode='full'); if bones are visibly mis-attached, restart Moho's bridge with MOHO_MCP_BONE_ORIGIN=tip.",
    shape: {
      layerName: z.string().optional(),
      parentId: z.number().int().optional(),
      scale: z.number().positive().optional().describe("1 = 1.3 units tall"),
      x: z.number().optional(),
      y: z.number().optional().describe("World Y of the hip (default -0.05)"),
    },
    handler: async ({ layerName, parentId, scale, x, y }) => {
      const id = await createBoneLayer(client, layerName ?? "Humanoid_Rig", parentId);
      return successContent(await buildSkeleton(client, id, humanoidBones({ scale, x, y })));
    },
  });

  defineCustomTool(server, {
    name: "rig_attachLayers",
    description:
      'Attach artwork layers to bones. mode "parent" makes the whole layer follow one bone (rigid parts: head, hands, props). "bind" binds every point of a vector layer to one bone. "flexi" flexi-binds the layer to ALL bones (bendy limbs, torso). boneName refers to a bone in the given bone layer.',
    shape: {
      boneLayerId: z.number().int(),
      attachments: z
        .array(
          z.object({
            layerId: z.number().int(),
            boneName: z.string().optional(),
            boneId: z.number().int().optional(),
            mode: z.enum(["parent", "bind", "flexi"]).default("parent"),
          }),
        )
        .min(1)
        .max(100),
    },
    handler: async ({ boneLayerId, attachments }) => {
      const bones = await fetchBones(client, boneLayerId);
      const ops: Operation[] = [];
      const problems: string[] = [];

      for (const a of attachments) {
        const bone = a.boneId !== undefined ? bones.find((b) => b.id === a.boneId) : bones.find((b) => b.name === a.boneName);
        if (!bone && a.mode !== "flexi") {
          problems.push(`layer ${a.layerId}: bone ${a.boneName ?? a.boneId} not found in layer ${boneLayerId}`);
          continue;
        }
        if (a.mode === "parent") {
          ops.push({ method: "layer.setParentBone", params: { layerId: a.layerId, boneId: bone!.id } });
          continue;
        }
        const pts = (await callMoho(client, "mesh.getPoints", { layerId: a.layerId })) as
          { pointCount?: number; points?: unknown[] };
        const count = pts.pointCount ?? pts.points?.length ?? 0;
        if (count === 0) {
          problems.push(`layer ${a.layerId}: has no points to bind`);
          continue;
        }
        ops.push({
          method: "mesh.bindPoints",
          params: {
            layerId: a.layerId,
            pointIndices: Array.from({ length: count }, (_, i) => i),
            boneId: a.mode === "flexi" ? -2 : bone!.id,
          },
        });
      }

      const summary = ops.length > 0 ? await runBatch(client, ops) : null;
      return successContent({ applied: ops.length, summary, problems });
    },
  });

  defineCustomTool(server, {
    name: "rig_createSmartBone",
    description:
      "Create a smart-bone dial in one call: creates the action for a control bone, records the given poses inside it, then returns to the main timeline. Each pose is {frame, bones:[{boneId, angle?, posX?, posY?, scale?}]} recorded inside the action (e.g. head-turn left/right, mouth open). Frames are action-timeline frames.",
    shape: {
      layerId: z.number().int().describe("Bone layer"),
      controlBoneId: z.number().int().describe("The bone that becomes the dial"),
      poses: z
        .array(
          z.object({
            frame: z.number(),
            bones: z.array(
              z.object({
                boneId: z.number().int(),
                angle: z.number().optional(),
                posX: z.number().optional(),
                posY: z.number().optional(),
                scale: z.number().optional(),
              }),
            ).min(1),
          }),
        )
        .min(1),
    },
    handler: async ({ layerId, controlBoneId, poses }) => {
      const control = (await fetchBones(client, layerId)).find((b) => b.id === controlBoneId);
      if (!control) throw new Error(`Bone ${controlBoneId} not found in layer ${layerId}`);

      const ops: Operation[] = [
        { method: "bone.createSmartAction", params: { layerId, boneId: controlBoneId } },
        { method: "layer.activateAction", params: { layerId, actionName: control.name } },
        ...poses.flatMap((p) =>
          p.bones.map((b) => ({ method: "bone.setTransform", params: { layerId, frame: p.frame, ...b } })),
        ),
        // Leaving the action must happen even if a pose failed, so it is its own step below.
      ];
      const summary = await runBatch(client, ops, { stopOnError: true });
      const back = await runBatch(client, [
        { method: "layer.activateAction", params: { layerId, actionName: "" } },
      ]);
      return successContent({ action: control.name, summary, returnedToMainTimeline: back.failed === 0 });
    },
  });
}
