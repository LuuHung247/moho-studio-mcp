---
name: moho-technique-frame-by-frame
description: Frame-by-frame and swap-art animation in Moho — switch layers as drawing sequences, frame-by-frame layers with onion skin, image sequences, expression sets, hand-drawn effects (fire, smoke, water), cel-style timing on twos. Use for hand-drawn animation, mouth/eye/hand swaps, effects with drawn frames, imported image sequences.
---

# Frame-by-frame and swap-art

Source: Moho 13.5 Tutorial 5.10 (Frame by Frame layers) and switch-layer chapters.

## When
Motion that bones can't do (fire, smoke, splashes, squash-and-stretch faces, walk cycles drawn by hand), or any asset that swaps shapes: mouths, eyes, hands, expressions, props in different states.

## A. Switch layer as a drawing sequence **[API]** (works without Pro frame-by-frame layers)
1. `layer_createLayer` type `switch`, name e.g. "Fire".
2. Create one vector child per drawing (`parentId` = switch layer): `f01`, `f02`, … and draw each with `draw_*` (keep the same registration/position; vary the shape gradually).
3. Play them back with timing = cues:
```mcp anim_lipSync
{"switchLayerId": 40, "cues": [{"frame": 1, "mouth": "f01"}, {"frame": 3, "mouth": "f02"}, {"frame": 5, "mouth": "f03"}, {"frame": 7, "mouth": "f04"}, {"frame": 9, "mouth": "f01"}]}
```
(`anim_lipSync` is simply "child name per frame" — it is the frame sequencer for any switch layer.) Repeat the cue list over the shot length for loops (generate by script).
4. Check one loop in screenshots frame by frame, then tune timing.

## Timing guidance (24 fps)
- Draw "on twos" (new drawing every 2 frames) for most character/effect animation, "on ones" for fast action, "on threes" for slow subtle motion.
- Cycles: 8–12 drawings for fire/water, 6–8 for a walk cycle. First and last drawing must connect.
- Add squash/stretch and arcs; overlap parts (hair after head).

## B. Frame-by-frame layer **[GUI]** (Pro)
1. New layer → *Frame by Frame* (or a switch layer used FBF); **F5** adds a new frame/drawing and advances time by one frame.
2. Turn on **Onion Skins** (button above the timeline) to see the previous/next drawing faintly.
3. Draw each frame (Draw Shape, Freehand…). Keep consistent volume; shorten/lengthen drawings with the timeline.
Use `input_sendKeys` `{"keys": "f5"}` and screenshots in a loop only if you must automate it; prefer method A.

## C. Image sequences and external animation
- Rendered or drawn PNG sequences (`name_0001.png`, …): `project_import` with `asImageSequence: true` (path = first image or its folder). Then `layer_setTransform` to place/scale.
```mcp project_import
{"filePath": "D:\\Phim\\assets\\fire\\fire_0001.png", "asImageSequence": true}
```
- Video clips: `project_import` the movie (audio comes with it as a separate layer when present).
- Photo-style rigging: see `moho-technique-bones-binding` (image layers can be warped by bones).

## D. Expression and prop swaps
Switch layer per feature: eyes (`open`, `half`, `closed`, `surprised`), brows, hands (`fist`, `open`, `point`), props (`full`, `empty`). Change state with `switch_setActive` at a frame; use step interpolation implicitly (switch changes are instant). Keep states the same size/anchor.
```mcp switch_setActive
{"layerId": 41, "frame": 48, "childName": "surprised"}
```

## Checklist
- [ ] Same canvas position for every drawing. [ ] Loop joins smoothly. [ ] Timing table written (which drawing at which frame). [ ] Screenshot strip reviewed (frames n, n+2, n+4…).
