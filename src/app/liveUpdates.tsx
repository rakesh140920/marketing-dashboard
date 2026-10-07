import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../api/api';
import type { AppDispatch } from './store';

/**
 * Live updates over Server-Sent Events (GET /api/events).
 * The backend sends tiny "this kind of data changed" messages when a worker finishes
 * (lead researched, draft written, email sent, search done) or someone else edits data;
 * we turn those into RTK Query cache invalidations so only the affected data is refetched.
 * While the stream is down, pages fall back to slow polling via `useLiveUpdates().connected`.
 */

type Tag = 'Product' | 'Search' | 'Lead' | 'Email' | 'Stats' | 'Settings';

const TAGS_FOR: Record<string, Tag[]> = {
  search: ['Search', 'Lead', 'Product', 'Stats'],
  lead: ['Lead', 'Search', 'Stats'],
  email: ['Email', 'Lead', 'Stats'],
  product: ['Product'],
  settings: ['Settings', 'Stats'],
};
const ALL_TAGS: Tag[] = ['Product', 'Search', 'Lead', 'Email', 'Stats', 'Settings'];

/** Events often arrive in bursts (e.g. 3 leads researched at once) — refetch once per burst. */
const BATCH_MS = 400;

const LiveContext = createContext({ connected: false });

export function LiveUpdatesProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const source = new EventSource(`${import.meta.env.VITE_API_URL || '/api'}/events`);
    const pending = new Set<Tag>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hasConnectedBefore = false;

    const queue = (tags: Tag[]) => {
      tags.forEach((t) => pending.add(t));
      timer ??= setTimeout(() => {
        dispatch(api.util.invalidateTags([...pending]));
        pending.clear();
        timer = undefined;
      }, BATCH_MS);
    };

    source.onmessage = (e: MessageEvent<string>) => {
      let event: { type?: string };
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === 'ready') {
        setConnected(true);
        // After a reconnect we may have missed events — refresh everything once
        if (hasConnectedBefore) queue(ALL_TAGS);
        hasConnectedBefore = true;
        return;
      }
      const tags = event.type ? TAGS_FOR[event.type] : undefined;
      if (tags) queue(tags);
    };

    // The browser reconnects by itself; until then pages use their fallback polling
    source.onerror = () => setConnected(false);

    return () => {
      source.close();
      if (timer) clearTimeout(timer);
    };
  }, [dispatch]);

  return <LiveContext.Provider value={{ connected }}>{children}</LiveContext.Provider>;
}

/** `connected` is true while the live stream is open; use it to switch off polling. */
export const useLiveUpdates = () => useContext(LiveContext);
