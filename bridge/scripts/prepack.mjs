// Copies the Lua plugin (without tests) and LICENSE into the package folder
// so `npm pack` ships everything `install-plugin` needs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bridge = path.resolve(here, "..");
const repo = path.resolve(bridge, "..");
const dest = path.join(bridge, "plugin");

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const f of ["MohoMCP_Server.lua", "MohoMCP_Poller.lua", "json.lua"]) {
  fs.copyFileSync(path.join(repo, "moho-plugin", f), path.join(dest, f));
}
fs.cpSync(path.join(repo, "moho-plugin", "moho_mcp"), path.join(dest, "moho_mcp"), { recursive: true });
fs.copyFileSync(path.join(repo, "LICENSE"), path.join(bridge, "LICENSE"));
fs.copyFileSync(path.join(repo, "README.md"), path.join(bridge, "README.md"));
console.log("plugin copied into bridge/plugin");
