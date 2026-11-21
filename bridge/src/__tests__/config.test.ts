import { describe, it, expect } from "vitest";
import { config } from "../config.js";

describe("config", () => {
  describe("moho section", () => {
    it("has a default ipcDir string", () => {
      expect(typeof config.moho.ipcDir).toBe("string");
      expect(config.moho.ipcDir.length).toBeGreaterThan(0);
    });

    it("has pollInterval of 100ms", () => {
      expect(config.moho.pollInterval).toBe(100);
    });

    it("has a requestTimeout of 10000ms", () => {
      expect(config.moho.requestTimeout).toBe(10000);
    });
  });

  describe("server section", () => {
    it('has name "moho-mcp"', () => {
      expect(config.server.name).toBe("moho-mcp");
    });

    it('has version "1.4.0"', () => {
      expect(config.server.version).toBe("1.4.0");
    });
  });

  describe("structure", () => {
    it("has the expected top-level keys", () => {
      const keys = Object.keys(config);
      expect(keys.sort()).toEqual(["boneOrigin", "ffmpegPath", "moho", "server"]);
    });
  });
});
