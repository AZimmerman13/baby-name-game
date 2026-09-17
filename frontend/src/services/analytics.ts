import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Thin wrapper around Plausible (script loaded in public/index.html).
// Uses the manual script so we control the URL that gets reported —
// pool URLs contain IDs and admin tokens that must never leave the site.

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: ((event: string, options?: { u?: string; props?: Props }) => void) & { q?: unknown[] };
  }
}

const SOURCE_KEY = 'storkpool_create_source';

const send = (event: string, options?: { u?: string; props?: Props }) => {
  try {
    window.plausible?.(event, options);
  } catch {
    // Analytics must never break the app
  }
};

// Collapse private identifiers so every pool page reports as one path
export const redactPath = (pathname: string): string =>
  pathname
    .replace(/^\/pool\/[^/]+/, '/pool/:id')
    .replace(/^\/results\/[^/]+/, '/results/:id');

export const track = (event: string, props?: Props) => {
  send(event, props ? { props } : undefined);
};

// Remember which CTA sent a visitor to create a pool, for attribution
export const trackCreateCta = (source: string) => {
  try {
    sessionStorage.setItem(SOURCE_KEY, source);
  } catch {
    // sessionStorage unavailable (private mode, etc.)
  }
  track('Create CTA Clicked', { source });
};

export const consumeCreateSource = (): string => {
  try {
    const source = sessionStorage.getItem(SOURCE_KEY);
    sessionStorage.removeItem(SOURCE_KEY);
    return source || 'direct';
  } catch {
    return 'direct';
  }
};

export function PageviewTracker() {
  const location = useLocation();

  useEffect(() => {
    // Query strings (e.g. ?admin=token, ?token=reset) are intentionally dropped
    send('pageview', { u: `${window.location.origin}${redactPath(location.pathname)}` });
  }, [location.pathname]);

  return null;
}
