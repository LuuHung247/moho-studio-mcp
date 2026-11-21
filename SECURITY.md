# Bảo mật & Windows

**Mô hình tin cậy:** server chạy cục bộ, tin AI client của bạn như chính bạn. Nó có thể mở/ghi file, chạy ffmpeg và (qua `input_*`) bấm chuột/phím vào Moho. Chỉ nối vào client bạn tin tưởng.

Đã kiểm tra / vá (lần quét 21/11/2026):
- Không có secret/khoá nào trong mã nguồn; bridge không mở cổng mạng (stdio + file IPC).
- `@modelcontextprotocol/sdk` 1.32.2 (bản mới nhất, vá 2 lỗi cao), zod 4.6.7, vitest mới nhất.
- Lệnh shell trong plugin Lua ghép từ đường dẫn: `util.ensureDir` từ chối `" % & | < > ^ ` $ ; !` và ký tự điều khiển.
- ffmpeg chạy bằng mảng tham số (không qua shell); đường dẫn phải tuyệt đối, cục bộ, không có `http://`, `concat:`, `pipe:`, `-`…, không có xuống dòng (chặn tiêm chỉ thị vào file concat).
- `input_*`: toạ độ phải hữu hạn trong ±20000, `steps` ≤ 200, phím chỉ trong bảng VK cho phép (không ghép chuỗi tuỳ ý vào PowerShell).
- Request IPC bị xoá trước khi xử lý và có khoá chống chạy lồng nhau.

Còn lại (chấp nhận, nên biết):
- Đã nâng lên `zod@4.6.7` (vá GHSA-mrhx-c7xc-m3w5), đồng thời vẫn giữ giới hạn `.max()` cho mọi mảng tham số (`LIMITS` trong `bridge/src/tools/schema.ts`; `registry.test.ts` fail nếu thiếu). `npm audit`: 0 lỗ hổng.
- Thư mục IPC nằm trong `%TEMP%` của user (Windows: chỉ user đó truy cập). Trên macOS/Linux `/tmp` dùng chung — đặt `MOHO_MCP_IPC_DIR` vào thư mục riêng 0700.
- `keep-alive.ps1` chạy với `-ExecutionPolicy Bypass` từ `%TEMP%`; tiến trình cùng user vốn đã có quyền tương đương.
- Plugin Lua cài vào Program Files phải chạy `install-plugin.bat` bằng Administrator.

Windows:
- Cần `powershell.exe` (có sẵn Win10/11) cho `input_*` và chụp cửa sổ.
- Lua của Moho dùng API file ANSI: nếu **tên user Windows có dấu tiếng Việt**, thư mục `%TEMP%` có ký tự non-ASCII. Khung render tự chuyển sang `C:\moho-mcp\` (hoặc đặt `MOHO_MCP_RENDER_DIR`). Thư mục IPC thì Lua đọc `%TEMP%`; nếu lệnh bị timeout, hãy đặt biến môi trường hệ thống `TEMP`/`TMP` về `C:\Temp` rồi mở lại Moho và Codex.
- Đường dẫn `.moho`, `.mp4` do bạn chỉ định có dấu thì bridge/ffmpeg xử lý được, nhưng `project_open`/`render_frame` đi qua Lua nên nên dùng đường dẫn ASCII cho an toàn.
