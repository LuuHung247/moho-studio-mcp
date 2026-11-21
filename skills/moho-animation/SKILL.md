---
name: moho-animation
description: Animate in Moho with anim_walkCycle, anim_runCycle, anim_wave, anim_oscillate, anim_blink, anim_lipSync, anim_layerPath, anim_fade, bone_setTransform. Use for "cho nhân vật đi bộ/chạy/vẫy tay/chớp mắt/nói chuyện", bouncing, floating, props moving, timing and easing.
---

# Animation

All recipes write keyframes in one batched call and loop cleanly. `layerId` for rig recipes is the **bone layer** id from `moho-rigging`. Moho smooths between keys automatically.

## Timing
`frames = seconds × fps` (24 fps typical). A 10 s scene = frames 1…240. Set the scene length first (`project_setProperties` `endFrame`). Plan a timeline table (what happens at which frame) before issuing calls.

## Walk / run
```mcp anim_walkCycle
{"layerId": 20, "startFrame": 1, "cycles": 4, "travel": 1.0}
```
- One cycle = two steps, 24 frames (walk) / 14 frames (run). `frames` overrides; `intensity` (0.1–3) scales swing, bounce, lean.
- `travel` = hip X distance per cycle. **Avoid foot sliding:** ≈ 1.0 per cycle for a walk at scale 1 and intensity 1; ≈ 1.8 for `anim_runCycle`; multiply by the rig `scale`. Character faces +x (right); mirror the whole group via `layer_setTransform` `scaleX: -1` to face left.
- Total distance = `travel × cycles`; keep it inside the shot (about ±1.7 wide). To cross the screen more slowly use fewer/lower `travel` plus camera pan.
- Alternative: keep `travel: 0` (walk in place) and slide the whole character with `anim_layerPath`, useful for treadmill/camera-follow shots.

## Gestures and loops
```mcp anim_wave
{"layerId": 20, "startFrame": 100, "side": "R", "duration": 48, "swings": 3, "amplitude": 0.5}
```
```mcp anim_oscillate
{"layerId": 20, "boneId": 1, "property": "scale", "amplitude": 0.015, "period": 72, "cycles": 10, "startFrame": 1}
```
`anim_oscillate` = breathing (spine `scale`, period 72), nodding (head `angle`, 0.1, period 36), tail wag (`angle`, 0.4, period 20), floating (`posY`, 0.03, period 60). Always add subtle breathing to idle characters so they are not frozen.

## Eyes and mouth
```mcp anim_blink
{"startFrame": 1, "endFrame": 240, "switchLayerId": 30, "openChild": "open", "closedChild": "closed", "interval": 72, "seed": 3}
```
Without switch layers, squash eye layers: `{"startFrame": 1, "endFrame": 240, "eyeLayerIds": [31, 32]}`. Use `at: [frames…]` for exact blink times (e.g. on a surprise beat).

Lip-sync: Moho cannot analyze audio through the API. Build cues yourself:
1. Get timings from the script/user (word start/end in seconds) or analyze audio with ffmpeg in a shell: `ffmpeg -i voice.wav -af silencedetect=noise=-35dB:d=0.12 -f null -` → speech segments.
2. Per syllable alternate open shapes (`AI`, `E`, `O`, `U`) with `MBP`/`rest` on closures; end every phrase with `rest`. frame = round(seconds × fps).
```mcp anim_lipSync
{"switchLayerId": 40, "cues": [{"frame": 1, "mouth": "rest"}, {"frame": 6, "mouth": "AI"}, {"frame": 10, "mouth": "E"}, {"frame": 14, "mouth": "MBP"}, {"frame": 18, "mouth": "O"}, {"frame": 26, "mouth": "rest"}]}
```
For frame-accurate pro lip-sync, offer the user Moho's own *Switch layer → Lip sync* (Papagayo data) through the GUI (`moho-advanced-gui-fallback`).

## Props, vehicles, bounces, fades
```mcp anim_layerPath
{"layerId": 50, "keys": [{"frame": 1, "x": -1.5, "y": -0.6}, {"frame": 12, "x": -1.0, "y": 0.2}, {"frame": 24, "x": -0.5, "y": -0.6}, {"frame": 36, "x": 0, "y": 0.2}, {"frame": 48, "x": 0.5, "y": -0.6}]}
```
Bounce = alternate low/high keys; squash/stretch via `scale`. Fade a character in/out:
```mcp anim_fade
{"layerIds": [10], "from": 0, "to": 1, "startFrame": 1, "endFrame": 12}
```

## Hand-keying (when no recipe fits)
- Bones: `bone_setTransform` `{layerId, boneId, frame, angle|posX|posY|scale}`.
- Any layer: `layer_setTransform`, `layer_setOpacity`, `animation_setKeyframe` (`value` number or `{x,y}`), `animation_setInterpolation` (`linear|smooth|ease_in|ease_out|step`; `step` for pops/blinks) — interpolation is set on layer channels.
- Many keys at once: `batch_execute` (≤ 200 ops per call).
Principles: anticipation before big moves, overlap/follow-through on tails and hair (`anim_oscillate` with `phase` offsets), hold poses 6–12 frames for acting beats, ease in/out for natural motion.

## Verify
Screenshot at the start, middle (two or three key poses) and end frames (`document_screenshot` with `frame`). Check feet planted, no detached parts, motion stays in frame. Re-run a recipe with new numbers to adjust (later keys overwrite the same frames); `document_undo` reverts the last change.
