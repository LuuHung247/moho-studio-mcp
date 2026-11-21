---
name: moho-delegation
description: Orchestrator/worker protocol for Moho jobs — a main agent plans and reviews while cheaper sub-agents drive Moho. Covers which MOHO_MCP_TOOLSET each worker gets, the task brief and report templates, the state.md id table, token-saving rules, and the one-worker-at-a-time constraint. Use when splitting a film into tasks, spawning sub-agents, or when the user wants lower token cost.
---

# Orchestrator / worker delegation

Roles (names are examples: *sol* = orchestrator, *luna* = worker):
- **Orchestrator** — talks to the user in Vietnamese, plans scenes, writes briefs, reviews proofs, decides next steps. Needs almost no Moho tools.
- **Worker** — executes ONE well-defined task in Moho with the MCP tools and reports back briefly.

## Hard constraints
1. **Only ONE worker may drive Moho at a time.** Moho has one open document and the plugin answers requests one by one; two bridge processes also share the same request-id space (collisions). Parallelism is fine for things that don't touch Moho: writing the script/storyboard, generating or cleaning images, audio analysis (ffmpeg), writing cue lists, ffmpeg joins.
2. Workers start with **no memory**: the brief must contain every id, path and number they need.
3. Moho work is **sequential by dependency**: art → rig → animation → scene/camera → export.

## Token budget (what costs what)
- Every MCP tool definition is sent to the agent each session: all 87 tools ≈ **16k tokens**. Give each worker only what its task needs with `MOHO_MCP_TOOLSET` (set in that worker's MCP config `env`):
| Task | `MOHO_MCP_TOOLSET` | Tools | ≈ tokens |
|---|---|---|---|
| Orchestrator that must peek/save only | `film` | 19 | 2.8k |
| Setup, layers, import, batch | `core` | 34 | 4.8k |
| Drawing characters/backgrounds | `art` | 52 | 8.8k |
| Rigging | `rig` | 50 | 8.2k |
| Animation | `anim` | 59 | 9.8k |
| Export / join / audio | `film` | 19 | 2.8k |
| Anything unusual or GUI automation | `full` | 87 | 16.1k |
Combine groups with commas (`core,render`). The screenshot and ping tools are always included.
- **Screenshots are the biggest recurring cost.** They are returned downscaled (800 px scene, 1280 px full window). Ask for more only to inspect detail (`maxWidth`). Check a handful of key frames, not every frame.
- Load **one skill per task** (the one named in the brief) instead of the whole set.
- Prefer recipes/batches (`draw_*`, `rig_buildHumanoid`, `anim_*`, `batch_execute`) over many single calls; avoid dumping lists (`mesh_getPoints`, repeated `document_getLayers`) — read `state.md` instead.

## `state.md` (shared memory in the workspace)
Keep it in the workspace folder (created by `init-workspace`). Workers read it first and update it after creating anything:
```
# State
Scene file: D:\Ai project\moho-phim\scenes\canh01.moho   fps 24   frames 1-240
## Layers            (name → layerId)
## Bones             (bone layer id; name → boneId)
## Done / Next
```
Never guess an id that is not in `state.md`; if it is missing, look it up once and write it down.

## Brief template (orchestrator → worker)
```
GOAL: <one sentence, observable result>
SKILL: <skill name to load>      TOOLSET: <preset>
CONTEXT: scene file, fps, frame range, ids (from state.md), asset paths
DO: <numbered steps or the exact style/timing wanted>
DON'T: <things to leave untouched>
DONE WHEN: <checks, e.g. "screenshot at frame 1 and 48 shows the bear centered; walk loops 4 cycles">
REPORT: see format below
```
## Report template (worker → orchestrator, ≤ 12 lines, no raw tool output)
```
STATUS: done | partial | blocked
CHANGED: layers/bones/keys created (name → id)  [also written to state.md]
FILES: saved scene path, proof images (render/proof_*.png via render_frame)
CHECKED: frames reviewed + what looked right/wrong
OPEN ISSUES: anything unresolved, with the exact error text
```
Workers save proofs with `render_frame` (small PNG files in the workspace); the orchestrator opens at most 2–3 proofs per stage.

## Stage plan for a short film
1. Orchestrator: story, shot list with frame counts, palette, character sheet; creates `state.md`. (No Moho.)
2. Worker `core`+`art`: project settings, backgrounds, character parts → `moho-character-art`.
3. Worker `rig`: skeleton + attach → `moho-rigging` (+ `moho-technique-bones-binding`).
4. Worker `anim`: walk/gestures/blinks/lip-sync/camera → `moho-animation`, `moho-technique-lipsync`.
5. Orchestrator reviews proofs; sends **specific** fixes (`moho-revision` table) to a worker.
6. Worker `film`: export each scene, join, add audio → `moho-film-export`.

## When a worker is stuck
Two failed attempts → stop, report the exact error and what was tried, set STATUS blocked. The orchestrator then loads `moho-troubleshooting`, adjusts the brief, or asks the user. Workers must not retry in loops or switch to `full` toolset on their own.

## MCP config example (worker with a narrow toolset)
```toml
[mcp_servers.moho]
command = "node"
args = ["/Ai project/moho-mcp/bridge/dist/index.js"]
[mcp_servers.moho.env]
MOHO_MCP_TOOLSET = "anim"
```
Use ONE active Moho MCP entry at a time; change the toolset per task (or use separate Codex profiles/configs per role).
