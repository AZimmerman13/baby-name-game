import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// First-party analytics: events are sent to our own backend (/api/events).
// Pool URLs contain IDs and admin tokens, so paths are redacted and query
// strings are never sent.

type Props = Record<string, string | number | boolean>;

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const SOURCE_KEY = 'storkpool_create_source';
const ENTRY_KEY = 'storkpool_entry';
export const IGNORE_KEY = 'storkpool_ignore_analytics';

// Collapse private identifiers so every pool page reports as one path
export const redactPath = (pathname: string): string =>
  pathname
    .replace(/^\/pool\/[^/]+/, '/pool/:id')
    .replace(/^\/results\/[^/]+/, '/results/:id');

// Where this visit came from, captured once per session so later events keep the attribution
const getEntry = (): { referrer: string | null; utm_source: string | null } => {
  try {
    const saved = sessionStorage.getItem(ENTRY_KEY);
    if (saved) return JSON.parse(saved);
    const entry = {
      referrer: document.referrer || null,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    };
    sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
    return entry;
  } catch {
    return { referrer: document.referrer || null, utm_source: null };
  }
};

const isIgnored = (): boolean => {
  try {
    return localStorage.getItem(IGNORE_KEY) === '1';
  } catch {
    return false;
  }
};

const send = (name: string, props?: Props) => {
  if (isIgnored() || window.location.pathname.startsWith('/admin')) return;
  try {
    const body = JSON.stringify({
      name,
      path: redactPath(window.location.pathname),
      props,
      ...getEntry(),
    });
    const url = `${API_BASE_URL}/events`;
    // sendBeacon survives page navigation (e.g. clicking a CTA); fetch keepalive is the fallback
    const queued = navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
    if (!queued) {
      fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
        .catch(() => {});
    }
  } catch {
    // Analytics must never break the app
  }
};

export const track = (event: string, props?: Props) => {
  send(event, props);
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
    send('pageview');
  }, [location.pathname]);

  return null;
}
