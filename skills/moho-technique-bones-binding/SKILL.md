---
name: moho-technique-bones-binding
description: Moho bone and binding techniques — art must sit INSIDE the bone layer, flexible vs region binding, bone strength, layer binding vs manual point binding, split-apart setup with Offset Bone, parenting order, constraints, dynamics, targets, enhanced bones. Use when a rig deforms wrongly ("rubbery", parts move together), when building cutout rigs, or when choosing how to bind art to bones.
---

# Bones and binding techniques

Source: Moho 13.5 Tutorial Manual (Bones chapter). **[API]** = MCP tool; **[GUI]** = Moho window.

## Mental model
Vector art is soft rubber; bones are stiff wires inside it. Bones never render. Frame 0 is the bone setup frame; poses are keyframes from frame 1.

## Must-know rules
1. **Art layers must be children of the bone layer** (dragged "into" it in the Layers panel). A bone layer only controls what it contains. **[API]** create the bone layer, then move each art layer into it with `layer_placeInGroup` `{layerId: art, parentGroupId: boneLayer}`; or create art with `layer_createLayer` `parentId` = the bone layer id. If the API refuses, drag in the Layers panel **[GUI]**.
2. **Parent order matters.** A new bone becomes the child of the *selected* bone. Build spine → thigh → shin → foot. To branch (second leg/arm), reselect the parent first. `rig_buildSkeleton` handles this by `parent` names; fix a wrong parent with `bone_setRestPose` `parentBoneId`.
3. **Binding modes** (bone layer → Layer Settings → *Bones* tab **[GUI]**):
   - *Flexible* (default): every bone influences every point, falling off with distance → "rubbery" (moving a hand twitches a foot).
   - *Region*: each bone has a cutoff radius (*Bone Strength* tool, **[GUI]**); only points inside regions move; outside any region → follows the nearest bone. Cleaner. Size each region to just enclose its body part; joints should overlap two regions.
4. **Three ways to bind art:** automatic (above), manual point binding (*Bind Points* tool; **[API]** `mesh_bindPoints` with a bone id, −2 = flexi-bind all, −1 = unbind) and **layer binding** (whole layer follows ONE bone rigidly; **[API]** `layer_setParentBone`, `rig_attachLayers` mode `parent`). Use layer binding for rigid parts: head, hands, feet, props, switch layers with mouths/eyes. Manual point binding breaks at elbows (points stretch apart) and cannot warp image layers — avoid it unless you need exact control.
5. **Split-apart technique** for several parts in one skeleton: move parts apart at frame 0, add bones and regions, then reassemble with the *Offset Bone* tool **[GUI]**; at frame 0 the character looks split, from frame 1 it is assembled. With `rig_buildHumanoid` + layer binding you don't need this.
6. *Use Selected Bones for Flexi-Binding* (Bone menu **[GUI]**) isolates a subset of bones to a layer (e.g. right-arm bones affect only the right-arm art) — avoids splitting.

## Cutout rig recipe (most reliable)
1. Separate vector layer per part, all inside the bone layer.
2. `rig_buildHumanoid` (or `rig_buildSkeleton`).
3. `rig_attachLayers` → every part `parent` mode to its bone.
4. Overlap joints with rounded shapes; hide seams (`moho-technique-drawing`).
5. Test: pose bones with `bone_setTransform` at frame 12, screenshot, `document_undo`.
For one soft body part (a tail, tentacle, spine curve): one layer, `flexi`/region binding, 4–6 bones.

## Advanced bone features
| Feature | Use | How |
|---|---|---|
| **Constraints** (min/max angle) | knees/elbows that must not hyperextend | **[GUI]** Bone Constraints tool |
| **Dynamics** (spring/damping/torque) | tails, ears, hair that swing after the parent stops | **[GUI]** Bone Dynamics; parameters per bone. Cheaper alternative **[API]**: `anim_oscillate` with `phase` offsets |
| **IK / bone targets** | feet planted, hand reaching a point | **[GUI]** *Bone Target* / IK; animated targets, animated parenting (change what a bone follows over time) |
| **Isolated parenting** | bone follows parent position but not rotation (e.g. a hat) | **[GUI]** *Enhanced Bone Features* |
| **Angle/position controls** (one bone drives others) | mouth bones driven by one control, eyelids | **[GUI]** Bone Constraints; or smart bones **[API]** `rig_createSmartBone` |
| Manipulating | test/pose | **[GUI]** *Manipulate Bones*: drag rotates; Alt+drag on parentless bone rotates, plain drag translates |

## Diagnose "wrong deformation"
| Symptom | Cause | Fix |
|---|---|---|
| Whole character squishes when one limb moves | Flexible binding + all art auto-bound | layer-bind rigid parts (`rig_attachLayers`), or Region binding + strengths |
| Part ignores the bones | art outside the bone layer | `layer_placeInGroup` into the bone layer |
| Limb bends at the wrong spot | bone joint not at the art's joint | `bone_setRestPose` `posX/posY/length/angle` at frame 0 |
| Elbow stretches/tears | manual point binding | go back to automatic binding (flexi) for that layer |
| Moves only at frame 0 | edits made at frame 0 are setup | animate at frame ≥ 1 |

```mcp layer_placeInGroup
{"layerId": 14, "parentGroupId": 20, "top": false}
```
```mcp bone_setRestPose
{"layerId": 20, "boneId": 6, "posX": 0, "posY": 0, "angle": -1.57, "length": 0.2}
```
```mcp mesh_bindPoints
{"layerId": 14, "pointIndices": [0, 1, 2, 3, 4, 5], "boneId": 5}
```
