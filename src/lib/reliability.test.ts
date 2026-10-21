import { describe, expect, test } from "bun:test";
import { ensureBrowserStorage } from "./storage-bootstrap";
import { isAssetLoadError } from "./page-recovery";

describe("startup reliability", () => {
  test("blocked storage uses isolated memory without crashing auth initialization", () => {
    const target = {};
    Object.defineProperty(target, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    ensureBrowserStorage(target as Window);
    const storage = (target as Window).localStorage;
    storage.setItem("cart", "preserved");
    expect(storage.getItem("cart")).toBe("preserved");
    const second = {};
    ensureBrowserStorage(second as Window);
    expect((second as Window).localStorage.getItem("cart")).toBeNull();
  });
  test("existing storage is retained, not erased", () => {
    const storage = { getItem: () => "session" };
    const target = { localStorage: storage };
    ensureBrowserStorage(target as unknown as Window);
    expect(target.localStorage).toBe(storage);
  });
  test("only stale asset failures trigger recovery", () => {
    expect(isAssetLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isAssetLoadError(new Error("Invalid password"))).toBe(false);
  });
});