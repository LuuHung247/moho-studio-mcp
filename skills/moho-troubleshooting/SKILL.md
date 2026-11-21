---
name: moho-troubleshooting
description: Diagnose and fix Moho MCP problems — timeouts, "server is not running", "No handler", failed system_selfTest steps, bones misplaced after rig_buildHumanoid, shapes not drawn, render or ffmpeg errors, Windows non-ASCII paths. Use whenever a tool returns an error or the result looks wrong.
---

# Troubleshooting

First, read the exact error text, then match below. After a fix, re-run the failed tool and `document_screenshot`.

## Connection
| Symptom | Cause → fix |
|---|---|
| `MOHO MCP server is not running. No status file…` | Server not started → Moho: Scripts → MohoMCP → Start/Stop MohoMCP Server |
| `Request … timed out` | Poller tool not selected, or Moho minimized, or a modal dialog is open → select **MohoMCP Poller** (last toolbar group), restore the window, close dialogs |
| timeouts only for the user whose Windows name has diacritics | `%TEMP%` has non-ASCII chars → set system `TEMP`/`TMP` to `C:\Temp`, restart Moho + agent |
| `No handler for …` / unknown method | Plugin is older than the bridge → reinstall: `npx -y <release .tgz URL> install-plugin` (Administrator), restart Moho |
| plugin console: `Failed to load moho_mcp.tools.X` | missing/corrupt plugin file → reinstall as above |

## Drawing
| Symptom | Fix |
|---|---|
| `Moho created no shape` / `Unexpected point count` | `WeldPoints`/`CreateShape` behave differently on this build. Fall back to `mesh_addPoint` + `mesh_createShape`; run `system_selfTest`, report Moho version |
| `… is not a vector layer` | pass the id of a VECTOR layer (create with `type: "vector"`) |
| shape appears but has no color | `warnings` field lists failed style channels → `mesh_setShapeStyle` |
| everything is tiny/huge | wrong units: visible area is x ±1.78, y ±1; check with `document_screenshot` |
| part hidden behind another | `layer_placeBehind` / re-order |

## Rigging and animation
| Symptom | Fix |
|---|---|
| Bones misplaced after `rig_buildHumanoid` (each child shifted by its parent's length, or all bones stacked) | The child-bone origin convention differs. Ask the user to set env var `MOHO_MCP_BONE_ORIGIN=tip` in the MCP server config (`[mcp_servers.moho.env]`), restart the agent, delete the rig layer (`layer_deleteLayer`) and rebuild |
| `Rig has no bone for role "…"` | the bone is named differently → rename with `bone_setRestPose` `name`, or rebuild with `rig_buildHumanoid` |
| Part does not follow its bone | re-run `rig_attachLayers`; ensure part layers are in the same group hierarchy as the bone layer (`layer_placeInGroup`) |
| Legs/arms bend the wrong way or spin | angles are radians; check rest angles with `layer_getBones`; `intensity` lower |
| Foot sliding | adjust `travel` (≈1.0 per walk cycle at scale 1) |
| Keys left over from an old take | `animation_deleteKeyframe`, or `document_undo` |
| Stuck "in an action" (keys go to a smart-bone action) | `layer_activateAction` with empty `actionName` |

## Rendering / export
| Symptom | Fix |
|---|---|
| `ffmpeg not found` | install ffmpeg or set `MOHO_MCP_FFMPEG` |
| `Render finished but no file was written` / `Frame N: …` | check free disk and permissions; set `MOHO_MCP_RENDER_DIR` to a simple folder like `C:\moho-render`; test `render_frame` on one frame |
| export timed out | raise `tool_timeout_sec` (e.g. 900–1800); export in ranges and `render_concatVideos` |
| black/empty video | all layers hidden or camera far away: screenshot frame 1; check `layer_setVisibility`, camera keys |
| `outputPath: use an absolute path` | give a full path like `D:\Phim\a.mp4` |

## Escalation
If a failure repeats after one fix: stop, run `system_selfTest`, save the document, and give the user (in Vietnamese) a short report: what you tried, the exact error, the Moho version from `system_ping`, and what you need from them.
