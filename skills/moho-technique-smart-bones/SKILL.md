---
name: moho-technique-smart-bones
description: Smart bones in Moho Pro — how a control bone's rotation drives an action (shape corrections, expression dials, head turns, 360-degree smart bones, mouth/Bone Lip Sync, live performance), Make Smart Bone Dial, correct rig_createSmartBone usage. Use for elbow/knee corrections, expressions, head rotation, mouth poses driven by one bone.
---

# Smart bones

Source: Moho 14 manual 5.12, 21.15 and tutorials 11.20, 14.5 notes. Pro only.

## What they are
A smart bone links **one bone's rotation** to an **action**. While the bone rotates from 0 to its extreme angle, the action plays from frame 0 (neutral) to its last frame. Inside the action you record whatever should change: point positions/curvature of vector layers, line width, colors, other bones' rotation/translation/scale, layer transform/opacity/blur, switch-layer choice, layer order/visibility, flips, shape-effect positions. Typical uses: **elbow/knee bend correction**, **expression dials** (angry ↔ happy), **head turns**, **eyelids**, **mouth poses**, hand shapes.

## Manual setup (what Moho does) **[GUI]**
1. Put art in a bone layer, add bones, name the control bone (names auto-assign, e.g. B2).
2. *Window → Actions → New action*; select the bone first and the action is named after it (the name is what links them).
3. Inside the action (timeline turns blue): rotate the control bone to the extreme angle (Rotate/Transform Bone — the Manipulate Bones tool is disabled in smart actions), then reshape the art / pose other bones for that extreme.
4. Back to **Mainline**. Rotating the bone now plays the action automatically. Make a second action for the opposite direction if you need both ways (separate actions for positive and negative angles).
5. **Bone → Make Smart Bone Dial…** automates it: set Name, Minimum/Maximum angle (e.g. −90/90), Duration (frames; more = smoother), "separate actions for positive and negative"; then scrub to min and to max and edit the scene at each.
- Spread long actions out (e.g. 24–120 frames) to give room to fix ugly in-betweens; edit the in-between frames inside the action, not in the mainline.
- First and last pose of a 360° action must match.

## 360° smart bones (14.4+)
One action that rotates the bone a full turn (Shift while rotating snaps to 45°/90°/360°, relative to the bone's rest angle, e.g. 14.3° + 360° = 374.3°) so the art is defined at EVERY angle — avoids breakage when the limb rotates beyond the two-sided range (elbows, wheels, spinning props). Frame 0 and the last frame must show identical art.

## With MCP tools
`rig_createSmartBone` builds the action and records bone poses **[API]**:
```mcp rig_createSmartBone
{"layerId": 20, "controlBoneId": 9, "controlAngle": 1.5708, "poses": [
  {"frame": 24, "bones": [{"boneId": 3, "angle": 0.5}, {"boneId": 8, "angle": -0.2}]}
]}
```
- The tool creates the action named after the control bone, records the poses at the given frames, **keys the control bone itself to `controlAngle` at the last frame** (this is what maps rotation to the action), and returns to the main timeline.
- It records **bone** motion only. Shape corrections (point moves, curvature, colors) need the GUI inside the action, or low-level `mesh_*` calls while `layer_activateAction` is on (mesh point tools are not keyframed per-action in the API — verify in a screenshot).
- Test: pose the control bone in the mainline (`bone_setTransform` at frame 12 with angle = controlAngle), screenshot, then remove the test key (`document_undo`). `layer_listActions` shows existing actions.
```mcp layer_listActions
{"layerId": 20}
```

## Live and phoneme use (Moho 14.5)
- **Live Performance Mode**: link camera (head turn, face), microphone, keyboard or gamepad to smart bones/actions to puppeteer in real time; *File → Live Mode with Virtual Webcam* streams it. Build a Smart Bone Action for each input you want (head turn, mouth, brows). **[GUI]**
- **Audio Phonemes + Bone Lip Sync**: analyze an audio layer to get phoneme labels on the timeline; the *Bone Lip Sync* script then generates keys on a "Mouth" smart bone from phoneme labels inside its action (`moho-technique-lipsync`). **[GUI]**

## Checklist
- [ ] Control bone named, action named identically. [ ] Neutral at frame 0, extreme at the last frame. [ ] Both directions covered if needed. [ ] Mainline restored (`layer_activateAction` with empty `actionName`). [ ] Tested at several angles with screenshots.
