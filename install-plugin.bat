@echo off
setlocal EnableExtensions EnableDelayedExpansion
echo ============================================
echo  Moho Studio MCP - Plugin Installer (Windows)
echo ============================================
echo.
echo Run this file as Administrator (right-click ^> Run as administrator):
echo Moho lives in Program Files, which needs elevated rights to modify.
echo.

rem --- Locate Moho: %MOHO_DIR% wins, otherwise try the usual folders --------
set "MOHO_ROOT="
if defined MOHO_DIR if exist "%MOHO_DIR%\Resources\Support\Scripts" set "MOHO_ROOT=%MOHO_DIR%"
if not defined MOHO_ROOT for %%D in (
    "C:\Program Files\Moho 14"
    "C:\Program Files\Moho Pro 14"
    "C:\Program Files\Moho 14.5"
    "C:\Program Files\Moho Pro 14.5"
    "C:\Program Files (x86)\Moho 14"
    "D:\Program Files\Moho 14"
) do (
    if not defined MOHO_ROOT if exist "%%~D\Resources\Support\Scripts" set "MOHO_ROOT=%%~D"
)
if not defined MOHO_ROOT (
    echo ERROR: Could not find Moho. Set MOHO_DIR to your Moho folder, for example:
    echo   set MOHO_DIR=C:\Program Files\Moho 14
    echo   install-plugin.bat
    exit /b 1
)
echo Found Moho at: %MOHO_ROOT%

set "SCRIPTS=%MOHO_ROOT%\Resources\Support\Scripts"
set "DEST=%SCRIPTS%\Menu\MohoMCP"
set "TOOL_DEST=%SCRIPTS%\Tool"
set "SRC=%~dp0moho-plugin"

if not exist "%SRC%\MohoMCP_Server.lua" (
    echo ERROR: %SRC%\MohoMCP_Server.lua not found. Run this script from the repository root.
    exit /b 1
)

echo.
echo Copying plugin files (whole folders, so new tool modules are never missed)...
if exist "%DEST%" rmdir /S /Q "%DEST%"
mkdir "%DEST%" || goto :copyfail
copy /Y "%SRC%\MohoMCP_Server.lua" "%DEST%\" >NUL || goto :copyfail
copy /Y "%SRC%\json.lua" "%DEST%\" >NUL || goto :copyfail
xcopy /E /I /Y /Q "%SRC%\moho_mcp" "%DEST%\moho_mcp" >NUL || goto :copyfail

echo Copying the poller tool...
copy /Y "%SRC%\MohoMCP_Poller.lua" "%TOOL_DEST%\" >NUL || goto :copyfail

echo Registering the poller in the tool list...
findstr /C:"MohoMCP_Poller" "%TOOL_DEST%\_tool_list.txt" >NUL 2>&1
if errorlevel 1 (
    echo tool	MohoMCP_Poller	...>> "%TOOL_DEST%\_tool_list.txt"
    echo   Added MohoMCP_Poller to _tool_list.txt
) else (
    echo   MohoMCP_Poller already registered
)

echo.
echo Installed files:
dir /s /b "%DEST%\*.lua"
echo.
echo ============================================
echo  Installation complete
echo ============================================
echo  1. Restart Moho.
echo  2. Scripts menu ^> MohoMCP ^> Start/Stop MohoMCP Server
echo  3. Pick the "MohoMCP Poller" tool in the toolbar (last group) and leave it selected.
echo  4. Build the bridge: cd bridge ^&^& npm install ^&^& npm run build
echo.
exit /b 0

:copyfail
echo.
echo ERROR: copy failed. Re-run as Administrator and make sure Moho is closed.
exit /b 1
