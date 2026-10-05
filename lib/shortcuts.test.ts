import { describe, expect, it } from "vitest";
import { comboFor, matchesCombo, SHORTCUTS } from "./shortcuts";

const ev = (o: Partial<KeyboardEvent>) => ({
  key: "",
  code: "",
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...o,
});

describe("matchesCombo", () => {
  it("matches alt combos by physical key (macOS Option types other characters)", () => {
    expect(matchesCombo(ev({ altKey: true, code: "Digit2", key: "™" }), "alt+Digit2")).toBe(true);
    expect(matchesCombo(ev({ altKey: true, code: "KeyT", key: "†" }), comboFor("timer"))).toBe(
      true,
    );
    expect(matchesCombo(ev({ code: "KeyT", key: "t" }), comboFor("timer"))).toBe(false);
  });

  it("treats mod as Ctrl or Cmd and respects shift", () => {
    expect(matchesCombo(ev({ ctrlKey: true, key: "z" }), "mod+z")).toBe(true);
    expect(matchesCombo(ev({ metaKey: true, key: "Z" }), "mod+z")).toBe(true);
    expect(matchesCombo(ev({ ctrlKey: true, shiftKey: true, key: "Z" }), "mod+z")).toBe(false);
    expect(matchesCombo(ev({ ctrlKey: true, shiftKey: true, key: "Z" }), "shift+mod+z")).toBe(true);
  });

  it("matches typed characters regardless of shift", () => {
    expect(matchesCombo(ev({ key: "?", shiftKey: true }), "?")).toBe(true);
    expect(matchesCombo(ev({ key: "/" }), "/")).toBe(true);
    expect(matchesCombo(ev({ key: "/", ctrlKey: true }), "/")).toBe(false);
  });

  it("has unique ids and combos", () => {
    const combos = SHORTCUTS.map((s) => s.combo).filter(Boolean);
    expect(new Set(combos).size).toBe(combos.length);
    expect(new Set(SHORTCUTS.map((s) => s.id)).size).toBe(SHORTCUTS.length);
  });
});
