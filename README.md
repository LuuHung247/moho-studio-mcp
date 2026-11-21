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
| 5. Sản xuất phim | `render_exportVideo` (ưu tiên **trình render dòng lệnh của Moho**, tự chuyển về xuất từng khung + ffmpeg nếu lỗi; mp4/mov/webm/gif + âm thanh) → `render_concatVideos` (nối các cảnh) `render_addAudio` |
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

**Cài bộ skill cho agent** (23 skill: 10 skill quy trình — định tuyến, kiểm tra kết nối, vẽ nhân vật, rig, animation, dựng cảnh/camera, xuất phim, chỉnh sửa, GUI dự phòng, xử lý sự cố — và 12 skill **kỹ thuật/tham chiếu** rút từ **Moho 14 Users Manual và Tutorial Guide chính thức**: vẽ, bone/binding, lip-sync (kể cả 14.5 Audio Phonemes), timeline/cycling/actions, smart bone, frame-by-frame, ảnh bitmap, chiều sâu/hiệu ứng, tái sử dụng/reference layer, **Character Wizard**, tính năng mới 14/14.5 và bản đồ giao diện; mỗi bước ghi rõ `[API]` làm được bằng tool hay `[GUI]` phải thao tác giao diện):

```powershell
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz install-skills
```
Lệnh copy vào `%USERPROFILE%\.codex\skills` (hoặc `$CODEX_HOME/skills`) và `%USERPROFILE%\.claude\skills`; thêm `--target codex` hoặc `--target claude` để chọn một nơi. Khởi động lại agent rồi nói: *"Dùng skill moho-studio, vẽ cho tôi…"*. Nguồn kỹ thuật: [Moho 14 Users Manual](https://manual.lostmarble.com/) và [Moho 14 Tutorial Manual](https://tutorial.lostmarble.com/) của Lost Marble (đọc như người xem; skill là bản chắt lọc và viết lại, không sao chép nguyên văn). Mã nguồn skill nằm ở [skills/](skills); mọi ví dụ trong đó được test tự động đối chiếu với schema tool thật.

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

## Thư mục làm việc (khuyến nghị)

Công cụ cài bằng `npx` nên **không cần giữ mã nguồn** ở máy làm phim. Chỉ cần một thư mục dự án, ví dụ `D:\Ai project\moho-phim` (đường dẫn có dấu cách vẫn dùng được):

```powershell
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz init-workspace "D:\Ai project\moho-phim" --skills
```
Lệnh tạo `assets/` (ảnh, âm thanh), `rigs/` (nhân vật đã rig), `scenes/` (mỗi cảnh một .moho), `render/` (video), cùng `AGENTS.md` ghi sẵn đường dẫn tuyệt đối và luật làm việc, và (với `--skills`) chép bộ skill vào `skills/` + `.claude/skills/`. **Mở Codex/Claude Code ngay trong thư mục đó**: agent tự đọc `AGENTS.md`, biết chỗ lưu và đọc skill, không cần bảo "bốc skill ra".

Skill nằm trong thư mục khác thì agent **không tự nạp**. Hai lựa chọn: cài chung bằng `install-skills` (dùng được từ mọi thư mục), hoặc `init-workspace --skills` như trên (gắn với một dự án). Nên đặt tên file ASCII (không dấu) vì Lua của Moho trên Windows có thể lỗi với đường dẫn có dấu.

## Tiết kiệm token / dùng sub-agent

Danh sách 87 tool tốn khoảng **16.000 token cho mỗi agent mỗi phiên**. Cho agent làm việc (worker) chỉ thấy nhóm tool nó cần bằng biến `MOHO_MCP_TOOLSET` trong cấu hình MCP:

| Giá trị | Tool | ≈ token | Dùng cho |
|---|---|---|---|
| `film` | 19 | 2,8k | xuất phim, nối cảnh |
| `core` | 34 | 4,8k | tạo project, layer, import, batch |
| `rig` | 50 | 8,2k | dựng xương, gắn layer |
| `art` | 52 | 8,8k | vẽ nhân vật, bối cảnh |
| `anim` | 59 | 9,8k | animation, lip-sync, camera |
| `full` (mặc định) | 87 | 16,1k | việc đặc biệt, điều khiển giao diện |

Có thể ghép: `core,render`. Ảnh chụp màn hình tự thu nhỏ (800 px; tuỳ chỉnh bằng `maxWidth`), kết quả JSON gọn. Skill `moho-delegation` hướng dẫn mô hình điều phối (agent chính lập kế hoạch và duyệt, sub-agent thao tác Moho), mẫu giao việc và báo cáo, file `state.md` lưu id layer/xương. **Chỉ một sub-agent được điều khiển Moho tại một thời điểm.**

## Cập nhật lên bản mới

`npx` lưu cache theo URL, nên link `latest` sẽ **không tự tải lại** bản mới trên máy đã chạy rồi. Cập nhật 3 bước:

```powershell
# 1. Xoá cache npx (Windows PowerShell)
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx" -ErrorAction SilentlyContinue
# macOS/Linux: rm -rf ~/.npm/_npx

# 2. Cài lại plugin (Administrator) và skill
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz install-plugin
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz install-skills

# 3. Kiểm tra phiên bản (phải khớp bản mới nhất ở trang Releases)
npx -y https://github.com/LuuHung247/moho-studio-mcp/releases/latest/download/moho-studio-mcp.tgz --version
```
Sau đó **khởi động lại Moho và agent** (Codex/Claude) để nạp plugin, skill và server mới.

Muốn cập nhật có kiểm soát (khuyến nghị): ghim phiên bản trong cấu hình, ví dụ `.../releases/download/v1.6.0/moho-studio-mcp.tgz`; nâng cấp = đổi `v1.6.0` thành phiên bản mới (URL mới nên tự tải lại, không cần xoá cache).

**Dán cho agent tự cập nhật:** *"Cập nhật Moho Studio MCP lên bản mới nhất: xoá cache npx, chạy install-plugin và install-skills từ link latest, chạy doctor và --version rồi báo kết quả; nhắc tôi khởi động lại Moho và agent."*

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
- **Kiểm thử**: 271 test TypeScript (gồm end-to-end với plugin giả + ffmpeg thật) và 187 test Lua (mock Moho).

## Giới hạn — nói thật

- **Chưa được thử trên Moho 14.5 thật** (môi trường phát triển là Linux, không có Moho). Logic, giao thức, pipeline ffmpeg đã test; các lời gọi API Moho dựa theo tài liệu [mohoscripting.com](https://mohoscripting.com) và code gốc đã chạy được. Hãy chạy `system_selfTest` — nó cho biết chính xác bước nào lỗi.
- Những điểm có rủi ro cao nhất: (a) quy ước vị trí xương con (đổi bằng biến môi trường `MOHO_MCP_BONE_ORIGIN=tip`), (b) `WeldPoints` để đóng hình kín trong `draw_*`, (c) `FileImport` mode, (d) khung thời gian của smart bone.
- Moho không có API cho một số thứ (tự lip-sync từ audio, vài bộ lọc) → AI phải dùng `input_*` + screenshot, và sẽ nói rõ khi không tự động hoá được.
- Plugin cần tool Poller được chọn và cửa sổ Moho không bị thu nhỏ; trong lúc render phim, giao diện Moho sẽ bận.
- Chất lượng nghệ thuật phụ thuộc AI: nó vẽ bằng hình học (elip, đa giác, đường cong). Muốn đẹp hơn, nhập ảnh/SVG của bạn bằng `project_import`.

## Phát triển

```bash
cd bridge && npm test            # 271 test TS (cần npm run build trước cho e2e)
lua moho-plugin/tests/run_tests.lua   # test Lua (mock Moho)
npm run docs                     # sinh lại docs/tool-reference.md
```
