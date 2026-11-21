---
name: moho-film-export
description: Render Moho scenes to video and assemble a finished film — render_exportVideo, render_concatVideos, render_addAudio, render_frame, thumbnails, ffmpeg checks. Use for "xuất phim", "render mp4", "nối các cảnh", "thêm nhạc nền", "xuất gif", final delivery.
---

# Film export

## Preflight (once per session)
```mcp render_checkEnvironment
{}
```
If ffmpeg is missing, tell the user to install it (Windows: `winget install Gyan.FFmpeg`, then reopen the terminal) or set `MOHO_MCP_FFMPEG`. Then:
1. `document_save` the scene.
2. `document_getInfo` → confirm `fps`, `startFrame`, `endFrame`, size.
3. Screenshots at first, middle and last frame — fix problems BEFORE rendering (rendering is slow).

## Export one scene
```mcp render_exportVideo
{"outputPath": "D:\\Phim\\canh1.mp4"}
```
- Renders every frame through Moho (PNG sequence in a temp folder) then encodes with ffmpeg; Moho's window is busy meanwhile. Expect roughly 0.2–2 s per frame depending on complexity.
- Formats by extension: `.mp4` (H.264, default), `.mov`, `.webm`, `.gif` (no audio).
- Partial: `startFrame`/`endFrame` for a preview range; `crf` 18 default (lower = better; 23 smaller files).
- Long exports: warn the user that it takes minutes, and that Codex's tool timeout must allow it (`tool_timeout_sec = 900` in the MCP config). For > 600 frames export in ranges (e.g. 1–240, 241–480) as separate files and concat.
- Use **absolute paths**, preferably ASCII; folders are created automatically.

Quick preview (low cost): export a 24–48 frame range, or render a still:
```mcp render_frame
{"filePath": "D:\\Phim\\thumb.png", "frame": 48}
```

## Several scenes → one film
Export every scene with the SAME size/fps, then join (fast stream copy):
```mcp render_concatVideos
{"inputs": ["D:\\Phim\\canh1.mp4", "D:\\Phim\\canh2.mp4", "D:\\Phim\\canh3.mp4"], "outputPath": "D:\\Phim\\phim.mp4"}
```
If inputs differ in codec/size/fps, set `"reencode": true`.

## Music and voice
Add ONE soundtrack to the finished film (not per scene) so music flows across cuts:
```mcp render_addAudio
{"videoPath": "D:\\Phim\\phim.mp4", "audioPath": "D:\\Phim\\nhac.mp3", "outputPath": "D:\\Phim\\phim_final.mp4"}
```
Single-scene shortcut: `render_exportVideo` with `audioPath` (+ `audioOffset` seconds: positive skips into the audio, negative delays it). Dialogue and effects that must sync: mix them into one audio file first with ffmpeg in a shell (`ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2 mix.wav`) — you have shell access in this environment.

## Delivery checklist
- [ ] Watch-check: extract frames with `ffmpeg -i phim.mp4 -vf fps=1 check_%03d.png` (shell) and look at a few, or open the file for the user.
- [ ] Duration ≈ expected (frames ÷ fps). [ ] Audio present and in sync. [ ] Tell the user the final path, size and length.
- Social formats: vertical 1080×1920 requires the project to be created at that size (`project_new`), not a crop.

## Failure handling
| Message | Action |
|---|---|
| `ffmpeg not found` | install / set `MOHO_MCP_FFMPEG`, rerun |
| `no file was written` / `Frame N: …` | `moho-troubleshooting` (render folder, ASCII path); rerun a small range to isolate the bad frame |
| timeout | raise `tool_timeout_sec`; export in ranges |
| video shorter than expected | `endFrame` too low — `project_setProperties`, re-export |
