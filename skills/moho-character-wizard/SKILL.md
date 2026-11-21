---
name: moho-character-wizard
description: Create a ready-made, already-rigged character with Moho's built-in Character Wizard (Window > Character Wizard) — presets, body/face/clothing/style tabs, walk and other actions, 8 views, export to the scene, then animate with actions. Use for "tạo nhân vật nhanh", "nhân vật có sẵn xương", "nhân vật đi bộ", when drawing and rigging by hand is too slow. GUI-driven.
---

# Character Wizard (Moho 14 manual, chapter 15)

The fastest way to a rigged, walking character. It is **[GUI] only** (no scripting API): drive it with `document_screenshot` `{"mode": "full"}` + `input_mouseClick` / `input_mouseDrag` (see `moho-advanced-gui-fallback`). Decide with the user: wizard (quick, stock look, customizable) vs hand-drawn art (`moho-character-art` + `moho-rigging`, unique look).

## Open and design
1. Menu **Window → Character Wizard** (also a button at the top right of the interface).
2. **Presets** drop-down: Boy Spiky, Creature, Mannequin (+ your own saved ones with the **+** button; built-in ones cannot be deleted). The **Randomize** button (bottom right) generates a unique character to start from.
3. A preview with a **view slider** shows eight angles (front, 3/4, side, back…). Check every view while tuning.
4. Tabs:
   - **Body**: proportions (height, torso height, leg length, head height, belly width), legs (hip width, leg width/muscles, foot length, foot style), arms (length, shoulder width, arm width/muscles, hand length, hand style).
   - **Face**: head style, neck width, eyes (shape, size, height, spacing), nose, mouth; Horizontal/Vertical adjustment sliders to re-seat features in the side and 3/4 views (check those views after changing head proportions).
   - **Movement**: actions (Walk is generated: steps per second, step distance, step height, arm swing, torso bend; Jump, Kick, Wave are bundled actions). Pro adds them as Actions in the scene; Debut can bake the walk as keys.
   - **Clothing** and **Style** (skin color, hair color, stroke color/width, scale compensation, randomize line width).
5. **Save your design** with **+** (name it, e.g. "Gau_Chinh") so every scene reuses the same character.

## Export into the scene
- Option **Export All Views** checked → five views (Front, Front 3/4, Back, Back 3/4, Side) come in as a **switch layer** with one bone group per view; unchecked → only the current view as a single bone group.
- Click **OK**. The character appears in the open document.
- **Transform the TOP switch layer** (position/scale/rotate) so all views move together: **[API]** `layer_getProperties` / `layer_setTransform` on that layer's id (find it with `document_getLayers`).
- Turning the character: switch the active view at frames with `switch_setActive` (childName = the view's bone group name) — see the 360° exercise (15.09): swap views over a few frames while the switch layer rotates.

## Animate it
- Actions appear in **Window → Actions** (Pro). To use one: select the character's bone group (a child of the switch layer, so the timeline shows it), put the playhead at the start frame, click the action once and **Insert Reference** **[GUI]**; repeat for the next action at later frames. Overlap and repeat as needed (`moho-technique-timeline-actions`).
- Walk across the screen: insert Walk at frame 1 (or start 0 for the single-view option), then keyframe the **switch layer's** position with `anim_layerPath` (e.g. x −1.8 → 1.8 across the walk). Match speed to the step distance to avoid foot sliding.
- Blink/talk: eyes may bring pre-animated blinks as actions. Mouth shapes come as part of the head; for dialogue see `moho-technique-lipsync`.
- Face/limb tweaks after export: the parts are normal vector layers inside bone groups; restyle shapes with `mesh_setShapeStyle`.

## Custom parts (advanced, Pro)
Authors can add their own heads/bodies/actions to the wizard (15.10–15.11): actions are .anme/.moho files with five bone layers (Back, Back 3/4, Side, Front 3/4, Front) animated in unison, saved in `Character Wizard/Actions` inside the custom content folder. For parts: **skin areas must be pure yellow (255,255,0) and hair areas pure cyan (0,255,255)** so the Style tab recolors them. Never overwrite the stock files; save under new names in the custom content folder.

## Checklist
- [ ] Preset chosen or designed, all 8 views checked. [ ] Preset saved. [ ] Export All Views set deliberately. [ ] Screenshot after OK. [ ] Transforms applied to the top switch layer. [ ] Actions inserted by reference. [ ] `document_save`.
