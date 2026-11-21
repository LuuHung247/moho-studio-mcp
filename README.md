# Moho Studio MCP

Cho phép AI (Codex, Claude Code, Claude Desktop…) **điều khiển Moho Pro 14.x** bằng ngôn ngữ tự nhiên: vẽ nhân vật vector, dựng xương, làm animation, dựng cảnh, xuất phim, và sửa theo phản hồi — bạn không cần viết Lua hay Python.

Dự án là bản làm lại từ [Jackp123/Moho-MCP](https://github.com/Jackp123/Moho-MCP) (MIT, gốc là Kveto/MohoMCP), được chọn vì đầy đủ nhất trong ba repo đã so sánh. Xem [NOTICE.md](NOTICE.md).

## Kiến trúc

```
Codex / Claude  ──MCP (stdio)──►  bridge (Node.js, TypeScript)  ──file JSON-RPC──►  plugin Lua trong Moho
                                       │                                                  │
                                       └── ffmpeg (xuất phim, nối cảnh)                   └── API Moho (MohoDoc, M_Mesh, M_Skeleton…)
```

- **plugin Lua** ([moho-plugin/](moho-plugin)) chạy *bên trong* Moho, gọi API script chính thức.
- **bridge** ([bridge/](bridge)) đổi MCP ↔ JSON-RPC, chứa các "công thức" animation và quy trình xuất phim.
- **87 tool** (xem [docs/tool-reference.md](docs/tool-reference.md), sinh tự động từ code).

## 6 mục tiêu → tool nào làm việc đó

| Mục tiêu | Tool chính |
|---|---|
| 1. Tạo nhân vật | `draw_ellipse` `draw_polygon` `draw_rect` `draw_polyline` (mỗi lệnh = 1 hình hoàn chỉnh có màu), `layer_createLayer`, `mesh_setShapeStyle` |
| 2. Rigging | `rig_buildHumanoid` (20 xương, đặt tên chuẩn), `rig_buildSkeleton` (xương tuỳ ý), `rig_attachLayers` (parent / bind / flexi-bind), `rig_createSmartBone` |
| 3. Animation | `anim_walkCycle` `anim_runCycle` `anim_wave` `anim_blink` `anim_lipSync` `anim_lipSyncFromAudio` (khớp môi tự động theo âm lượng file thoại) `anim_oscillate` `anim_layerPath` + `bone_setTransform` / `animation_setKeyframe` / `animation_setInterpolation` |
| 4. Dựng cảnh | `project_new` `project_import` `layer_duplicate` `layer_placeBehind` `anim_cameraMove` `anim_cameraShake` `anim_fade` `particle_setEmitter` |
| 5. Sản xuất phim | `render_exportVideo` (mp4/mov/webm/gif + âm thanh) → `render_concatVideos` (nối các cảnh) `render_addAudio` |
| 6. Chỉnh sửa theo phản hồi | `document_screenshot` (AI tự nhìn kết quả), `mesh_setShapeStyle`, `layer_setTransform`, chạy lại `anim_*` với tham số mới, `document_undo` |

AI nhận **cẩm nang sản xuất** ([bridge/src/guide.ts](bridge/src/guide.ts)) ngay khi kết nối, nên biết quy trình: vẽ → rig → animate → chụp màn hình kiểm tra → xuất.

## Cài đặt nhanh (không cần clone repo)

Yêu cầu: Moho Pro 14.x, [Node.js 20+](https://nodejs.org), [ffmpeg](https://ffmpeg.org/download.html) trong `PATH` (chỉ cần khi xuất phim).

**Windows** — mở terminal bằng *Run as administrator* (Moho nằm trong Program Files), rồi:

```powershell
# 1. Cài plugin vào Moho (tự tìm thư mục Moho)
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz install-plugin

# 2. Đăng ký MCP cho Codex
codex mcp add moho -- cmd /c npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz

# 3. Kiểm tra
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz doctor
```

**Cài bộ skill cho agent** (17 skill: 10 skill quy trình — định tuyến, kiểm tra kết nối, vẽ nhân vật, rig, animation, dựng cảnh/camera, xuất phim, chỉnh sửa, GUI dự phòng, xử lý sự cố — và 7 skill **kỹ thuật** rút từ Tutorial Manual chính thức của Moho: vẽ, bone/binding, lip-sync, timeline/cycling/actions, frame-by-frame, chiều sâu/hiệu ứng, tái sử dụng/reference layer; mỗi bước ghi rõ `[API]` làm được bằng tool hay `[GUI]` phải thao tác giao diện):

```powershell
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz install-skills
```
Lệnh copy vào `%USERPROFILE%\.codex\skills` (hoặc `$CODEX_HOME/skills`) và `%USERPROFILE%\.claude\skills`; thêm `--target codex` hoặc `--target claude` để chọn một nơi. Khởi động lại agent rồi nói: *"Dùng skill moho-studio, vẽ cho tôi…"*. Nguồn kỹ thuật: [Moho 13.5 Tutorial Manual](https://lostmarble.com/manual/13.5/Moho%20Tutorial%20Manual.pdf) (14.x chỉ thêm tính năng; manual 14 trên wiki chưa được dùng làm nguồn). Mã nguồn skill nằm ở [skills/](skills); mọi ví dụ trong đó được test tự động đối chiếu với schema tool thật.

**macOS / Linux-shell**: giống trên, bỏ `cmd /c`: `codex mcp add moho -- npx -y <URL>`. Claude Code: `claude mcp add moho -- npx -y <URL>`.

Hoặc ghi tay vào `%USERPROFILE%\.codex\config.toml` ([mẫu](codex-config.toml.example)):

```toml
[mcp_servers.moho]
command = "cmd"
args = ["/c", "npx", "-y", "https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz"]
startup_timeout_sec = 60
tool_timeout_sec = 900
```

Rồi trong Moho: mở/ tạo một tài liệu → *Scripts → MohoMCP → Start/Stop MohoMCP Server* → **chọn tool "MohoMCP Poller"** (nhóm cuối thanh công cụ) và để nguyên. Cuối cùng nói với Codex: *"Chạy system_ping rồi system_selfTest"*.

> **Cho agent tự cài:** dán vào Codex: *"Cài Moho Studio MCP giúp tôi: chạy `npx -y <URL> install-plugin`, rồi `codex mcp add moho -- cmd /c npx -y <URL>`, rồi `doctor` và báo kết quả."* (thay `<URL>` bằng link `.tgz` ở trên).

Bản dev (clone repo): xem mục *Phát triển*; installer cũ `install-plugin.bat` vẫn dùng được.

## Ví dụ yêu cầu bằng tiếng Việt

Xem [docs/PROMPTS-VI.md](docs/PROMPTS-VI.md). Ngắn gọn:

> "Tạo project 1920x1080, 24fps, dài 10 giây. Vẽ một chú gấu dễ thương, dựng xương, cho nó đi bộ từ trái sang phải trên nền đồi cỏ, rồi xuất mp4."

## Khác gì so với repo gốc

- **Tool bậc cao** (draw / rig / anim / render): 1 câu lệnh thay cho hàng chục lệnh cấp thấp.
- **Xuất phim thật**: render từng khung qua Moho → ffmpeg; nối cảnh; ghép âm thanh. Repo gốc chỉ chụp 1 khung.
- **`system_selfTest`**: tự kiểm tra toàn bộ đường API trên đúng bản Moho của bạn.
- **Sửa lỗi**: installer Windows/macOS gốc *không copy* `image/particle/switch.lua` (3 nhóm tool không chạy được); plugin có thể chạy cùng một request 2 lần nếu Moho vẽ lại trong lúc xử lý — đã thêm khoá chống re-entry.
- **Bridge viết lại**: 56 khối try/catch giống hệt → bảng khai báo; batch tự chia lô (tối đa 200 thao tác/lô); test hợp đồng giữa bridge và danh sách cho phép của plugin.
- **Bộ skill** cho agent (Codex / Claude Code), kiểm chứng bằng test.
- **Kiểm thử**: 227 test TypeScript (gồm end-to-end với plugin giả + ffmpeg thật) và 187 test Lua (mock Moho).

## Giới hạn — nói thật

- **Chưa được thử trên Moho 14.5 thật** (môi trường phát triển là Linux, không có Moho). Logic, giao thức, pipeline ffmpeg đã test; các lời gọi API Moho dựa theo tài liệu [mohoscripting.com](https://mohoscripting.com) và code gốc đã chạy được. Hãy chạy `system_selfTest` — nó cho biết chính xác bước nào lỗi.
- Những điểm có rủi ro cao nhất: (a) quy ước vị trí xương con (đổi bằng biến môi trường `MOHO_MCP_BONE_ORIGIN=tip`), (b) `WeldPoints` để đóng hình kín trong `draw_*`, (c) `FileImport` mode, (d) khung thời gian của smart bone.
- Moho không có API cho một số thứ (tự lip-sync từ audio, vài bộ lọc) → AI phải dùng `input_*` + screenshot, và sẽ nói rõ khi không tự động hoá được.
- Plugin cần tool Poller được chọn và cửa sổ Moho không bị thu nhỏ; trong lúc render phim, giao diện Moho sẽ bận.
- Chất lượng nghệ thuật phụ thuộc AI: nó vẽ bằng hình học (elip, đa giác, đường cong). Muốn đẹp hơn, nhập ảnh/SVG của bạn bằng `project_import`.

## Phát triển

```bash
cd bridge && npm test            # 227 test TS (cần npm run build trước cho e2e)
lua moho-plugin/tests/run_tests.lua   # test Lua (mock Moho)
npm run docs                     # sinh lại docs/tool-reference.md
```
