---
name: moho-session-check
description: Verify the Moho MCP connection and the Moho install before real work — system_ping, system_selfTest, doctor, plugin start-up steps. Use at the start of a session, after "không kết nối được", timeouts, or when the user says chạy thử / kiểm tra Moho.
---

# Session check

## Steps
1. `system_ping` — expect `success: true`, plugin version, `documentOpen`.
2. If `documentOpen` is false, ask the user to open or create a document in Moho (or call `project_new` after confirming nothing unsaved is open).
3. First time on this machine/Moho build: run `system_selfTest`. It creates temporary layers, draws, keyframes a bone, renders a frame, then cleans up. Report every failed step to the user in plain Vietnamese and stop before long work if "draw" or "render" steps fail.
4. Before a video export: `render_checkEnvironment` (ffmpeg present?).

```mcp system_ping
{}
```

```mcp system_selfTest
{"cleanup": true}
```

## If `system_ping` fails or times out
Tell the user these steps (exact Moho menu names):
1. In Moho: **Scripts → MohoMCP → Start/Stop MohoMCP Server** (console says "Server started").
2. Select the tool **MohoMCP Poller** in the toolbar (last group) and leave it selected; keep the Moho window visible (not minimized).
3. Plugin missing? Run in a terminal opened as Administrator: `npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz install-plugin`, restart Moho.
4. `… doctor` (same package) prints what is missing (Node, ffmpeg, Moho, plugin, status file).
5. Windows username with Vietnamese diacritics: set system env `TEMP` and `TMP` to `C:\Temp`, restart Moho and the agent.

## selfTest step → meaning
| Failed step | Likely cause | Action |
|---|---|---|
| create vector/bone layer | no document open, or script permission | open a document |
| draw ellipse/rect/polyline | `WeldPoints`/`CreateShape` differ in this Moho build | use `mesh_addPoint` + `mesh_createShape` (see `moho-advanced-gui-fallback`) and report the Moho version |
| add 2 chained bones / keyframe a bone | bone API differs | report; avoid `rig_*` tools until fixed |
| render one frame | `FileRender` could not write | check temp folder permissions / ASCII path |
