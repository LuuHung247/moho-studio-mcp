---
name: moho-rigging
description: Build skeletons and attach artwork in Moho — rig_buildHumanoid, rig_buildSkeleton, rig_attachLayers, rig_createSmartBone, layer_setParentBone, flexi-bind. Use for "dựng xương", "rig nhân vật", "gắn tay vào xương", smart bone, đầu quay, animals/props with custom bones.
---

# Rigging

## 1. Build the skeleton
Humanoid (20 named bones, front-facing, character-left = screen-right):
```mcp rig_buildHumanoid
{"layerName": "Gau_Rig", "scale": 1, "x": 0, "y": -0.05}
```
Result: `{layerId, bones: {hip: 0, spine: 1, neck: 2, head: 3, shoulder_L: 4, upper_arm_L: 5, forearm_L: 6, hand_L: 7, shoulder_R…, hip_L, thigh_L, shin_L, foot_L, …}}`. **Save `layerId` (bone layer) and the name→index map.** Bone indices are what `bone_setTransform` and `anim_oscillate` need.

Custom creature (tail, ears, quadruped…). Parents must appear before children; root has `x`,`y`,`angle` in world space (π/2 = up), children have angle relative to the parent and attach at the parent's tip (`attach: "start"` for the parent's base):
```mcp rig_buildSkeleton
{"layerName": "Cat_Rig", "bones": [
  {"name": "hip", "length": 0.2, "angle": 0, "x": -0.3, "y": 0},
  {"name": "spine", "parent": "hip", "length": 0.5, "angle": 0},
  {"name": "head", "parent": "spine", "length": 0.25, "angle": 0.4},
  {"name": "tail", "parent": "hip", "length": 0.45, "angle": 2.6, "attach": "start"}
]}
```
Use the role names `hip, spine, neck, head, upper_arm_L/R, forearm_L/R, thigh_L/R, shin_L/R, foot_L/R` for bones that should work with `anim_walkCycle`/`anim_wave`.

**Verify immediately:** `document_screenshot` with `mode: "full"` and check the bones sit inside the art. If every child bone is displaced by its parent's length, the bone-origin convention differs → `moho-troubleshooting` ("bones misplaced").

## 2. Attach art to bones
`rig_attachLayers` does it in one call:
- `parent` — whole layer follows one bone (rigid: head, hands, feet, props, eyes).
- `bind` — all points of a vector layer bound to one bone.
- `flexi` — all points flexi-bound to ALL bones (soft bending torso/limbs). Use sparingly: it needs sensible weights.
```mcp rig_attachLayers
{"boneLayerId": 20, "attachments": [
  {"layerId": 11, "boneName": "head", "mode": "parent"},
  {"layerId": 12, "boneName": "spine", "mode": "parent"},
  {"layerId": 14, "boneName": "upper_arm_L", "mode": "parent"},
  {"layerId": 15, "boneName": "forearm_L", "mode": "parent"},
  {"layerId": 16, "boneName": "hand_L", "mode": "parent"}
]}
```
Rule of thumb for cartoon characters: **parent every part rigidly to one bone** (cutout style). It is reliable and looks good with `anim_*` recipes. Overlap joints (shoulder/elbow/knee) with round shapes so rotation does not show gaps.

**Art layers must be children of the bone layer** (inside it, like dragging them into it in the Layers panel); a bone layer controls only what it contains. Move each part in with `layer_placeInGroup` `{layerId: part, parentGroupId: <bone layer id>}`, or create parts with `parentId` = the bone layer id. Parts outside the bone layer will not move. More on binding modes (flexible vs region), bone strength and troubleshooting: `moho-technique-bones-binding`.

## 2b. Make sure parts are inside the bone layer
```mcp layer_placeInGroup
{"layerId": 11, "parentGroupId": 20, "top": false}
```

## 3. Test the rig
Pose a few bones, screenshot, then undo the test keys:
```mcp bone_setTransform
{"layerId": 20, "boneId": 5, "frame": 12, "angle": 0.8}
```
Use `animation_deleteKeyframe` or `document_undo` to remove test poses. Check: arms swing from the shoulder, legs from the hip, head turns at the neck, no part detaches.

## 4. Smart bones (dials) — only when asked for expressive controls
Head turn, mouth open, eyelid etc. One call records the whole dial:
```mcp rig_createSmartBone
{"layerId": 20, "controlBoneId": 9, "controlAngle": 1.5708, "poses": [
  {"frame": 24, "bones": [{"boneId": 3, "angle": 0.5}]}
]}
```
It creates the action named after the control bone, records the poses inside it, keys the control bone itself to `controlAngle` at the last frame (this maps the bone's rotation to the action), and returns to the main timeline. Details, shape corrections, 360° and live use: `moho-technique-smart-bones`.

## Checklist before animating
- [ ] Bone map saved. [ ] Every visible part follows a bone. [ ] Screenshot at rest pose matches the original drawing. [ ] `document_save`.
