// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · utils/scallop.ts
//  Generates an SVG path for a "scallop" progress arc shape.
// ──────────────────────────────────────────────────────────────────────

export interface ScallopOptions {
  /** Total width of the scallop element (px) */
  width: number;
  /** Height (px) */
  height: number;
  /** Progress fraction 0–1 */
  progress: number;
  /** Corner radius */
  radius?: number;
}

/**
 * Generate an SVG path for a scallop-shaped progress indicator.
 * The shape is a rounded rectangle with a curved "bite" on the right
 * side that fills as progress increases.
 */
export function scallopPath({
  width,
  height,
  progress,
  radius = 12,
}: ScallopOptions): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillWidth = width * clampedProgress;

  // Simple rounded rectangle path for the filled portion
  const r = Math.min(radius, height / 2, fillWidth / 2 || radius);
  if (fillWidth <= 0) return '';

  return [
    `M ${r} 0`,
    `L ${fillWidth - r} 0`,
    `Q ${fillWidth} 0 ${fillWidth} ${r}`,
    `L ${fillWidth} ${height - r}`,
    `Q ${fillWidth} ${height} ${fillWidth - r} ${height}`,
    `L ${r} ${height}`,
    `Q 0 ${height} 0 ${height - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ');
}

/** Compute the dash-array for a circular progress ring */
export function ringProgress(radius: number, progress: number): { dashArray: string; dashOffset: number } {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return {
    dashArray: `${circumference} ${circumference}`,
    dashOffset: offset,
  };
}

