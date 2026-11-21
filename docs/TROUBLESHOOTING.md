# Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `MOHO MCP server is not running. No status file…` | Chưa bật server trong Moho | Scripts → MohoMCP → Start/Stop MohoMCP Server |
| Lệnh bị `timed out` | Tool "MohoMCP Poller" chưa được chọn, hoặc cửa sổ Moho thu nhỏ | Chọn Poller ở thanh công cụ (nhóm cuối); giữ cửa sổ Moho hiện |
| `No handler for …` / `WARNING: Failed to load …` trong console Moho | Cài thiếu file plugin | Chạy lại `install-plugin.bat` bằng quyền Administrator |
| `system_selfTest` lỗi ở "draw …" | `WeldPoints`/`CreateShape` khác bản Moho | Gửi nội dung lỗi; tạm dùng `mesh_addPoint` + `mesh_createShape` |
| Xương lắp sai chỗ sau `rig_buildHumanoid` | Quy ước vị trí xương con khác | Đặt `MOHO_MCP_BONE_ORIGIN=tip` trong `[mcp_servers.moho.env]` rồi dựng lại |
| `ffmpeg not found` | Chưa cài ffmpeg | Cài ffmpeg, thêm vào PATH hoặc đặt `MOHO_MCP_FFMPEG` |
| Xuất video báo "no file was written" | `FileRender` không ghi PNG | Thử `render_frame` thủ công; kiểm tra quyền ghi thư mục tạm |
| Video 0 byte / thiếu khung | Moho bận hoặc đóng giữa chừng | Giảm độ dài cảnh, xuất lại từng cảnh |
