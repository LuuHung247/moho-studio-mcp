---
name: moho-studio
description: Entry point for producing animation in Moho Pro through the moho MCP server. Use for ANY request about Moho, hoạt hình, làm phim hoạt hình, nhân vật, rig, xương, animation, dựng cảnh, xuất phim, or editing a Moho project — it routes to the right task skill and sets the working rules.
---

# Moho Studio — start here

You drive Moho Pro 14 through MCP tools named `system_*`, `project_*`, `draw_*`, `layer_*`, `rig_*`, `anim_*`, `render_*`, `document_*`. The user speaks Vietnamese and does not code: **reply in Vietnamese, hide technical detail, show results with screenshots.**

## Working rules (always)
1. First call `system_ping`. If it fails, load `moho-session-check`.
2. Every layer is addressed by the numeric `layerId` returned by `layer_createLayer`. Keep a running table `name → layerId` (and bone name → boneId) in your notes; never guess ids.
3. After every visible change call `document_screenshot` (scene mode) and compare with the request. Use `mode: "full"` to inspect bones and panels. Never say it looks right without looking.
4. Prefer high-level tools (`draw_*`, `rig_*`, `anim_*`, `render_*`). Use `batch_execute` when you must issue 2+ low-level calls.
5. Save early and often with `document_save`. `project_new` and `project_open` REPLACE the open document — save first.
6. Coordinates: layer units, y up, default 16:9 camera shows x −1.78…1.78, y −1…1. Angles are radians (0 = right, π/2 = up). Frame = seconds × fps.
7. If something cannot be automated, say so honestly and load `moho-advanced-gui-fallback`.

## Route the request
| User wants… | Load skill |
|---|---|
| Check Moho is connected, first run, "chạy thử" | `moho-session-check` |
| Draw a character / prop / background ("vẽ nhân vật…") | `moho-character-art` |
| Bones, attach parts, smart bones ("dựng xương", "rig") | `moho-rigging` |
| Move things: walk, run, wave, blink, talk, camera shake | `moho-animation` |
| New scene, background, layers order, camera, rain/snow | `moho-scene-camera` |
| Render to mp4, join scenes, add music ("xuất phim") | `moho-film-export` |
| Feedback / changes ("to hơn", "đổi màu", "nhanh hơn") | `moho-revision` |
| Low-level meshes, bezier, GUI clicks, unsupported features | `moho-advanced-gui-fallback` |
| An error message or wrong-looking result | `moho-troubleshooting` |

Technique skills (deeper "how Moho does it", from the official tutorials; each marks what is `[API]` vs `[GUI]`):
| Topic | Skill |
|---|---|
| Closed curves, holes, hidden edges, line width, shape order, masking, styles | `moho-technique-drawing` |
| Bone layers, binding modes, bone strength, constraints, dynamics, IK | `moho-technique-bones-binding` |
| Talking: auto/phoneme/manual lip-sync, `anim_lipSyncFromAudio` | `moho-technique-lipsync` |
| Keyframes, interpolation, cycling loops, actions, smart bones | `moho-technique-timeline-actions` |
| Hand-drawn frames, switch-layer swaps, image sequences | `moho-technique-frame-by-frame` |
| Z depth/parallax, camera, glow/shadow, particles, physics, 3D | `moho-technique-depth-effects` |
| Duplicates vs reference layers, importing objects, scene series | `moho-technique-reuse-references` |

## Typical full job (a short film)
1. `moho-session-check` → 2. per scene: `project_new` + `moho-scene-camera` (background) → 3. `moho-character-art` → `moho-rigging` → `moho-animation` → 4. screenshots at key frames, `moho-revision` until approved → 5. `document_save` → `moho-film-export`.
Ask the user only for creative choices (story, look, length). Decide technical details yourself.
