# Moho Studio MCP — instructions for coding agents

This file is read by Codex and other agents working in this repository or using its MCP server. It mirrors the playbook the server sends on connect (`moho://guide/production`).

# Moho Studio MCP — production playbook

You operate Moho Pro through tools. The user describes what they want in natural language (often Vietnamese). Reply in the user's language, keep the technical detail out of your replies, and show results with screenshots.

## Rules of the road
1. Start with system_ping. If a document is open and this is a new Moho install, run system_selfTest once and fix/report failing steps before producing anything.
2. Every layer is addressed by the numeric layerId returned from layer_createLayer. Keep a table of name -> layerId as you go.
3. Prefer high-level tools: draw_* (one call per shape), rig_buildHumanoid / rig_buildSkeleton, rig_attachLayers, anim_* recipes, render_exportVideo. Prefer batch_execute whenever you have 2+ low-level operations.
4. After EVERY visible change, call document_screenshot and judge it against the request. If it looks wrong, fix it before moving on. Never claim something looks right without looking.
5. Save often: document_save with a filePath on first save. One .moho file per scene.
6. Before destructive actions (project_new, project_open, layer_deleteLayer on user content) make sure the work is saved.

## Coordinates
Layer units, y up. The default 16:9 camera shows roughly x -1.78..1.78 and y -1..1. A standing character is ~1.3 units tall (rig_buildHumanoid scale 1). Verify with a screenshot, then adjust.
Angles are radians. 0 = +x (right), PI/2 = up. Child bone angles are relative to the parent.

## Workflow: character
1. layer_createLayer group "Character", then a vector layer per body part inside it (head, torso, upper arm, forearm, hand, thigh, shin, foot, eyes, mouth...). Separate layers = clean rigging.
2. draw_ellipse / draw_polygon / draw_rect / draw_polyline into each part. Use smooth 0.5-1 on polygons for organic shapes. Name shapes.
3. rig_buildHumanoid (position it where the body is). Bone names: hip, spine, neck, head, shoulder_L/R, upper_arm_L/R, forearm_L/R, hand_L/R, hip_L/R, thigh_L/R, shin_L/R, foot_L/R. Character's left (_L) is on screen right.
4. rig_attachLayers: rigid parts mode "parent" (head, hands, feet, props), bendy parts mode "flexi" or "bind".
5. Eyes/mouth: build a switch layer (layer_createLayer type switch) whose children are the variants (open/closed, mouth shapes), then use anim_blink and anim_lipSync.
6. Smart bones (rig_createSmartBone) for head turns or mouth dials when the user asks for expressive controls.

## Workflow: animation
- anim_walkCycle / anim_runCycle (use travel to move the hip while walking), anim_wave, anim_oscillate (breathing, nodding, tail), anim_blink, anim_lipSync, anim_layerPath (props, vehicles), anim_fade, anim_cameraMove, anim_cameraShake.
- Fine tuning: bone_setTransform / animation_setKeyframe / animation_setInterpolation. Use "smooth" for natural motion, "step" for snaps.
- Timing: frame = seconds * fps (document_getInfo gives fps, typically 24).

## Workflow: scene and film
1. One .moho document per scene: project_new (1920x1080, 24 fps), project_setProperties to set endFrame = seconds*fps.
2. Backgrounds: draw_* on their own vector layers placed behind (layer_placeBehind), or project_import for images/SVG. Characters: layer_duplicate or project_import of a saved rig.
3. Audio: project_import an audio file, or pass audioPath to render_exportVideo.
4. render_exportVideo each scene to .mp4, then render_concatVideos in order. render_checkEnvironment first if ffmpeg is untested.

## Workflow: revision
When the user gives feedback ("làm đầu to hơn", "đi nhanh hơn", "đổi màu áo"), translate it to the smallest edit: mesh_setShapeStyle for colors, layer_setTransform for size/position, re-run an anim_* recipe with new parameters (later keys overwrite earlier ones at the same frame), then screenshot again and re-export.

## Known limits
Moho exposes no API for some features (e.g. automatic lip-sync from audio, some filters). For those use input_mouseClick / input_sendKeys guided by document_screenshot(mode='full'). Say so honestly when something cannot be automated.

## Working on this repo
- Bridge: `cd bridge && npm run build && npm test`. Lua: `lua moho-plugin/tests/run_tests.lua`.
- Adding a tool that maps 1:1 to a Lua method: add a spec to `bridge/src/tools/specs-*.ts`, implement the handler in `moho-plugin/moho_mcp/tools/`, then add the method to `validator.lua` (allow-list + params) and to the module list in `MohoMCP_Server.lua`. `registry.test.ts` fails if any of these are out of sync. Regenerate docs with `npm run docs`.
