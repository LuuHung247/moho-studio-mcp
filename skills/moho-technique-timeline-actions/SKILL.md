---
name: moho-technique-timeline-actions
description: Moho timeline techniques — frame 0 vs animation, point/bone/layer animation, interpolation and animation curves, cycling keyframes (loops), actions (reusable clips, Insert Reference), smart bones, bone audio scripts, animated layer visibility and ordering. Use for looping motion, reusable walk/wave clips, easing, "lặp lại", "diễn lại nhiều lần".
---

# Timeline, cycling and actions

Source: Moho 13.5 Tutorials 1.5, 5.3–5.6, 5.11. **[API]** = MCP tool; **[GUI]** = Moho window.

## Three kinds of motion
| Kind | Good for | Tools |
|---|---|---|
| **Point** animation | soft distortions: smile, bulging belly | **[GUI]** *Transform Points* at a frame ≥ 1 (there is no point-move tool in the API). For soft squash/stretch via API use layer `scaleX/scaleY` keys |
| **Bone** animation | puppet characters | `bone_setTransform`, `anim_*` recipes |
| **Layer** animation | pans, zooms, whole-object moves, fades | `layer_setTransform`, `anim_layerPath`, `anim_fade`, `animation_setKeyframe` |
Keyframes live at times where something starts, stops or changes direction; Moho interpolates between. Frame 0 = setup (never animate there); first animation frame = 1.

## Interpolation and curves
- `animation_setInterpolation` modes: `smooth` (natural ease), `ease_in`, `ease_out`, `linear` (mechanical, scrolling), `step` (instant change: blinks, pops, visibility). Works on layer channels (`opacity`, `rotation`, `translation`, `scale`).
- Overshoot/wiggle ("springy settle"): add several decaying keys, e.g. rotation 0 → 0.35 → −0.2 → 0.1 → 0 over ~12 frames (`animation_setKeyframe` per key, or `anim_oscillate` for loops). The **[GUI]** Animation-curves (graph) view lets you right-click → *Add Keyframe* and drag points: use it only for fine-tuning.
- Timed visibility (appear/disappear): `layer_setOpacity` keys + `animation_setInterpolation` `step` on `opacity`.

## Cycling = loops without copying keys
Make one cycle of keys, then tell Moho to repeat it. **[GUI]**: in the timeline right-click the LAST keyframe of the cycle → *Cycle…* → *Absolute (cycle back to this exact frame)* and enter the frame to jump back to (e.g. blinker keys at 36 and 48, cycle back to 12 → blinks forever). The keyframe turns into a left-pointing arrow; the keys repeat to the end of the timeline.
**[API] alternatives**: `anim_walkCycle`/`anim_runCycle` with `cycles`; `anim_oscillate` with `cycles`; re-run a recipe with a later `startFrame`. For very long loops prefer GUI cycling (fewer keys, easier edits).

## Actions = reusable clips (Pro)
An action is a clip of animation attached to a layer/bone layer. The timeline's **Mainline** is the real film; actions are stored elsewhere and inserted by reference (changes to the action update every use).
1. **[API] Record an action:** `layer_activateAction` `{layerId, actionName}` (creates/opens it), pose bones with `bone_setTransform` at the action's own frames (1…N), then **return to Mainline**: `layer_activateAction` with an empty `actionName`. `layer_listActions` shows existing actions (which are smart-bone actions).
2. **[GUI] Use it:** Window → *Actions*; select the mainline frame, click the action once, press *Insert Reference*. Actions can overlap (wave while stepping) and repeat (insert again at the end frame of the previous insert). Moving the whole character across the screen is then a plain layer keyframe (`layer_setTransform` / `anim_layerPath`).
3. **Smart bones**: an action driven by a bone angle (dial). `rig_createSmartBone` records it in one call; rotating the control bone later plays the action. Use for head turns, mouth/eyelid dials, hand shapes.
```mcp layer_activateAction
{"layerId": 20, "actionName": "Wave"}
```
```mcp layer_activateAction
{"layerId": 20, "actionName": ""}
```
When to use actions vs `anim_*` recipes: recipes are the quick path in one scene; actions pay off when the same clip is reused many times or must be edited once for all uses.

## Audio-driven bone motion
**[GUI]** Scripts → Sound → *Bone Audio Wiggle*: keys the selected bone's angle from the loudness of an audio file (e.g. mouth, speaker cone, dancing prop). For switch-layer mouths use `anim_lipSyncFromAudio`.

## Animated layer order / depth sorting
- Layers moving in 3D can sort by depth automatically: group Layer Settings → *Sort layers by depth* **[GUI]**; move a layer toward the camera with `layer_setTransform` `transZ` (see `moho-technique-depth-effects`).
- Within one vector layer, order can change over time via *Animated shape order* (`moho-technique-drawing`).

## Review
Scrub with `document_setFrame`, screenshot key and in-between frames, check overshoot and holds; confirm loops join without a pop (first and last pose equal).
