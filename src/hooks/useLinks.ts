import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';

export interface LinkItem {
  id: string;
  label: string;
  url: string;
  createdAt: number;
}

const STORAGE_KEY = 'my-links';
const D_TAG = 'dance.jqw22.links';

function loadLocalLinks(): LinkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as LinkItem[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveLocalLinks(links: LinkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

/** Merge remote links into local storage, preserving local links not yet synced. */
function mergeLinks(remote: LinkItem[], local: LinkItem[]): LinkItem[] {
  const remoteMap = new Map(remote.map((l) => [l.id, l]));
  const merged = [...remote];

  for (const link of local) {
    if (!remoteMap.has(link.id)) {
      merged.push(link);
    }
  }

  // Sort by createdAt descending
  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged;
}

export function useLinks() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publish } = useNostrPublish();
  const queryClient = useQueryClient();

  const pubkey = user?.pubkey;
  const isLoggedIn = Boolean(pubkey);

  // Fetch links from Nostr when logged in
  const { data: links = [], isLoading, refetch } = useQuery<LinkItem[]>({
    queryKey: ['nostr', 'links', pubkey ?? ''],
    queryFn: async () => {
      if (!pubkey) {
        return loadLocalLinks();
      }

      const [event] = await nostr.query(
        [{ kinds: [30078], authors: [pubkey], '#d': [D_TAG], limit: 1 }],
        { signal: AbortSignal.timeout(5000) },
      );

      if (event?.content) {
        try {
          const remote = JSON.parse(event.content) as LinkItem[];
          const local = loadLocalLinks();
          const merged = mergeLinks(remote, local);
          saveLocalLinks(merged);
          return merged;
        } catch {
          return loadLocalLinks();
        }
      }

      // No remote data yet — fall back to local
      return loadLocalLinks();
    },
    staleTime: 0, // Always refetch on mount
    enabled: true,
  });

  const addLink = useCallback(
    async (label: string, url: string) => {
      const newLink: LinkItem = {
        id: crypto.randomUUID(),
        label,
        url,
        createdAt: Date.now(),
      };

      const updated = [newLink, ...links];
      saveLocalLinks(updated);

      if (isLoggedIn && pubkey) {
        try {
          await publish({
            kind: 30078,
            content: JSON.stringify(updated),
            tags: [['d', D_TAG]],
          });
        } catch (err) {
          console.error('Failed to publish links to Nostr:', err);
        }
      }

      queryClient.setQueryData(['nostr', 'links', pubkey ?? ''], updated);
    },
    [links, isLoggedIn, pubkey, publish, queryClient],
  );

  const deleteLink = useCallback(
    async (id: string) => {
      const updated = links.filter((link) => link.id !== id);
      saveLocalLinks(updated);

      if (isLoggedIn && pubkey) {
        try {
          await publish({
            kind: 30078,
            content: JSON.stringify(updated),
            tags: [['d', D_TAG]],
          });
        } catch (err) {
          console.error('Failed to publish links to Nostr:', err);
        }
      }

      queryClient.setQueryData(['nostr', 'links', pubkey ?? ''], updated);
    },
    [links, isLoggedIn, pubkey, publish, queryClient],
  );

  return { links, isLoading, addLink, deleteLink, refetch };
}
