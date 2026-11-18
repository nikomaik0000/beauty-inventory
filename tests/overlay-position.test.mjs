import test from "node:test";
import assert from "node:assert/strict";
import { calculateOverlayPosition } from "../lib/overlay-position.ts";

function rect({ top, left, width, height }) {
  return {
    top,
    left,
    width,
    right: left + width,
    bottom: top + height,
  };
}

test("popup opens downward at its final trigger-aligned coordinate", () => {
  assert.deepEqual(
    calculateOverlayPosition({
      trigger: rect({ top: 100, left: 40, width: 240, height: 40 }),
      viewportWidth: 800,
      viewportHeight: 700,
      align: "left",
    }),
    { left: 40, width: 240, top: 148, bottom: undefined, maxHeight: 288 },
  );
});

test("popup flips upward and never overlaps a dialog footer boundary", () => {
  const position = calculateOverlayPosition({
    trigger: rect({ top: 360, left: 120, width: 320, height: 40 }),
    boundary: rect({ top: 180, left: 100, width: 360, height: 260 }),
    viewportWidth: 600,
    viewportHeight: 800,
    align: "left",
  });

  assert.deepEqual(position, {
    left: 120,
    width: 320,
    top: undefined,
    bottom: 448,
    maxHeight: 172,
  });
});

test("right-aligned popup is clamped inside a narrow mobile viewport", () => {
  const position = calculateOverlayPosition({
    trigger: rect({ top: 80, left: 4, width: 36, height: 36 }),
    viewportWidth: 150,
    viewportHeight: 500,
    align: "right",
  });

  assert.equal(position.left, 8);
  assert.equal(position.width, 134);
  assert.equal(position.left + position.width, 142);
});

test("popup max height uses actual cramped space instead of overflowing its boundary", () => {
  const position = calculateOverlayPosition({
    trigger: rect({ top: 50, left: 20, width: 200, height: 40 }),
    boundary: rect({ top: 0, left: 0, width: 240, height: 150 }),
    viewportWidth: 240,
    viewportHeight: 600,
    align: "left",
  });

  assert.equal(position.maxHeight, 52);
  assert.equal(position.top, 98);
});
