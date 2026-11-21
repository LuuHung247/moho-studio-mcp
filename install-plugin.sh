#!/bin/bash
# Moho Studio MCP - plugin installer (macOS). Override the location with MOHO_DIR.
set -euo pipefail

echo "============================================"
echo " Moho Studio MCP - Plugin Installer (macOS)"
echo "============================================"

MOHO_ROOT="${MOHO_DIR:-}"
if [ -z "$MOHO_ROOT" ]; then
    for candidate in "/Applications/Moho 14" "/Applications/Moho Pro 14" "/Applications/Moho 14.5"; do
        if [ -d "$candidate" ]; then MOHO_ROOT="$candidate"; break; fi
    done
fi
if [ -z "$MOHO_ROOT" ] || [ ! -d "$MOHO_ROOT" ]; then
    echo "ERROR: Moho not found. Set MOHO_DIR to the Moho folder, e.g.:"
    echo "  MOHO_DIR=\"/Applications/Moho 14\" ./install-plugin.sh"
    exit 1
fi

SCRIPTS="$MOHO_ROOT/Moho Pro.app/Contents/Resources/Support/Scripts"
DEST="$SCRIPTS/Menu/MohoMCP"
TOOL_DEST="$SCRIPTS/Tool"
SRC="$(cd "$(dirname "$0")" && pwd)/moho-plugin"

if [ ! -f "$SRC/MohoMCP_Server.lua" ]; then
    echo "ERROR: $SRC/MohoMCP_Server.lua not found. Run from the repository root."
    exit 1
fi

echo "Found Moho at: $MOHO_ROOT"
echo "Copying plugin files (whole folders, so new tool modules are never missed)..."
rm -rf "$DEST"
mkdir -p "$DEST"
cp -f "$SRC/MohoMCP_Server.lua" "$SRC/json.lua" "$DEST/"
cp -R "$SRC/moho_mcp" "$DEST/moho_mcp"

echo "Copying the poller tool..."
cp -f "$SRC/MohoMCP_Poller.lua" "$TOOL_DEST/MohoMCP_Poller.lua"

if ! grep -q "MohoMCP_Poller" "$TOOL_DEST/_tool_list.txt" 2>/dev/null; then
    printf 'tool\tMohoMCP_Poller\t...\n' >> "$TOOL_DEST/_tool_list.txt"
    echo "Registered MohoMCP_Poller in _tool_list.txt"
else
    echo "MohoMCP_Poller already registered"
fi

echo
find "$DEST" -name '*.lua' | sort
echo
echo "Done. Restart Moho, then: Scripts > MohoMCP > Start/Stop MohoMCP Server,"
echo "and select the 'MohoMCP Poller' tool (last toolbar group)."
