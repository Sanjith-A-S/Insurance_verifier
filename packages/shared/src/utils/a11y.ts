// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · utils/a11y.ts
// ──────────────────────────────────────────────────────────────────────

/** Generate a stable HTML id from a string */
export function toHtmlId(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Compose multiple class names, filtering falsy values */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** ARIA live region helper — returns props for a live region element */
export function ariaLive(politeness: 'polite' | 'assertive' = 'polite') {
  return {
    role: 'status' as const,
    'aria-live': politeness,
    'aria-atomic': true,
  };
}

/** Return ARIA props for a disclosure trigger (accordion, details) */
export function ariaExpanded(expanded: boolean, controlsId: string) {
  return {
    'aria-expanded': expanded,
    'aria-controls': controlsId,
  };
}

/** Return ARIA props for a progress element */
export function ariaProgress(value: number, max: number, label: string) {
  return {
    role: 'progressbar' as const,
    'aria-valuenow': value,
    'aria-valuemax': max,
    'aria-valuemin': 0,
    'aria-label': label,
  };
}

/** Return safe keyboard handler that calls fn on Enter/Space */
export function onKeyActivate(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };
}

// Need to import React types for the keyboard handler
import type React from 'react';

