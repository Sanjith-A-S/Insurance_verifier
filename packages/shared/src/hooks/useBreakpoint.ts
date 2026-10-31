// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · hooks/useBreakpoint.ts
// ──────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

export type Breakpoint = 'compact' | 'medium' | 'expanded' | 'large' | 'xlarge';

const QUERIES: Record<Breakpoint, string> = {
  compact:  '(max-width: 599.98px)',
  medium:   '(min-width: 600px) and (max-width: 839.98px)',
  expanded: '(min-width: 840px) and (max-width: 1199.98px)',
  large:    '(min-width: 1200px) and (max-width: 1599.98px)',
  xlarge:   '(min-width: 1600px)',
};

export function useBreakpoint(): {
  breakpoint: Breakpoint;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  isDesktop: boolean;
  isMobile: boolean;
} {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'large';
    for (const [key, query] of Object.entries(QUERIES) as [Breakpoint, string][]) {
      if (window.matchMedia(query).matches) return key;
    }
    return 'compact';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const listeners: Array<() => void> = [];

    for (const [key, query] of Object.entries(QUERIES) as [Breakpoint, string][]) {
      const mql = window.matchMedia(query);
      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) setBp(key);
      };
      mql.addEventListener('change', handler);
      listeners.push(() => mql.removeEventListener('change', handler));
    }

    return () => listeners.forEach((fn) => fn());
  }, []);

  return {
    breakpoint: bp,
    isCompact:  bp === 'compact',
    isMedium:   bp === 'medium',
    isExpanded: bp === 'expanded',
    isLarge:    bp === 'large',
    isXLarge:   bp === 'xlarge',
    isDesktop:  bp === 'expanded' || bp === 'large' || bp === 'xlarge',
    isMobile:   bp === 'compact'  || bp === 'medium',
  };
}

