export interface OverlayRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
}

export interface OverlayPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const DEFAULT_GAP = 8;
const DEFAULT_MAX_HEIGHT = 288;
const DEFAULT_MIN_HEIGHT = 120;
const DEFAULT_EDGE_PADDING = 8;

/**
 * Calculates a fixed-position popup before it is mounted. The result is
 * clamped to both the viewport and an optional scroll-container boundary so
 * the first painted frame is also the final frame.
 */
export function calculateOverlayPosition({
  trigger,
  boundary,
  viewportWidth,
  viewportHeight,
  align,
  gap = DEFAULT_GAP,
  maxHeight = DEFAULT_MAX_HEIGHT,
  minHeight = DEFAULT_MIN_HEIGHT,
  edgePadding = DEFAULT_EDGE_PADDING,
  minWidth = 160,
}: {
  trigger: OverlayRect;
  boundary?: OverlayRect;
  viewportWidth: number;
  viewportHeight: number;
  align: "left" | "right";
  gap?: number;
  maxHeight?: number;
  minHeight?: number;
  edgePadding?: number;
  minWidth?: number;
}): OverlayPosition {
  const viewportTop = boundary ? Math.max(boundary.top, 0) : 0;
  const viewportBottom = boundary ? Math.min(boundary.bottom, viewportHeight) : viewportHeight;
  const spaceBelow = Math.max(0, viewportBottom - trigger.bottom - gap);
  const spaceAbove = Math.max(0, trigger.top - viewportTop - gap);
  const openUpward = spaceBelow < minHeight && spaceAbove > spaceBelow;
  const availableHeight = openUpward ? spaceAbove : spaceBelow;

  const availableWidth = Math.max(0, viewportWidth - edgePadding * 2);
  const desiredWidth = align === "right" ? Math.max(trigger.width, minWidth) : trigger.width;
  const width = Math.min(desiredWidth, availableWidth);
  const desiredLeft = align === "right" ? trigger.right - width : trigger.left;
  const left = Math.min(
    Math.max(desiredLeft, edgePadding),
    Math.max(edgePadding, viewportWidth - edgePadding - width),
  );

  return {
    left,
    width,
    top: openUpward ? undefined : trigger.bottom + gap,
    bottom: openUpward ? viewportHeight - trigger.top + gap : undefined,
    maxHeight: Math.min(maxHeight, availableHeight),
  };
}
