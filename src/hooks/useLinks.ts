import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface LinkItem {
  id: string;
  label: string;
  url: string;
  createdAt: number;
}

const STORAGE_KEY = 'my-links';
const TOKEN_KEY = 'github-token';

const OWNER = 'jqw22';
const REPO = 'dance';
const BRANCH = 'main';
const FILE_PATH = 'data/links.json';

const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE_PATH}`;
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

// ── localStorage helpers ──────────────────────────────────

function loadLocalLinks(): LinkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LinkItem[];
  } catch { /* ignore */ }
  return [];
}

function saveLocalLinks(links: LinkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setGitHubToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearGitHubToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasGitHubToken(): boolean {
  return !!getToken();
}

// ── GitHub API helpers ─────────────────────────────────────

/** Fetch links.json from the raw GitHub URL. Public, no auth needed. */
async function fetchFromGitHub(): Promise<LinkItem[] | null> {
  try {
    const res = await fetch(RAW_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return (await res.json()) as LinkItem[];
  } catch {
    return null;
  }
}

/** Write links.json to GitHub via the API. Needs a token. */
async function pushToGitHub(links: LinkItem[], token: string): Promise<boolean> {
  try {
    // First get the current file's SHA (required for updating via API)
    let sha: string | undefined;
    try {
      const getRes = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }
    } catch { /* file may not exist yet */ }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(links, null, 2))));

    const body: Record<string, string> = {
      message: 'Update links',
      content,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to push to GitHub:', err);
    return false;
  }
}

// ── Hook ───────────────────────────────────────────────────

export function useLinks() {
  const queryClient = useQueryClient();
  const token = getToken();

  const queryKey = useMemo(() => ['links', 'github'], []);

  const { data: links = [], isLoading, refetch } = useQuery<LinkItem[]>({
    queryKey,
    queryFn: async () => {
      // Try fetching from GitHub first
      const remote = await fetchFromGitHub();
      if (remote) {
        // Merge with local to preserve any unsaved local changes
        const local = loadLocalLinks();
        const remoteMap = new Map(remote.map((l) => [l.id, l]));
        const merged = [...remote];
        for (const link of local) {
          if (!remoteMap.has(link.id)) {
            merged.push(link);
          }
        }
        merged.sort((a, b) => b.createdAt - a.createdAt);
        saveLocalLinks(merged);
        return merged;
      }

      // Fall back to local
      return loadLocalLinks();
    },
    staleTime: 0,
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
      queryClient.setQueryData(queryKey, updated);

      if (token) {
        await pushToGitHub(updated, token);
      }
    },
    [links, token, queryClient, queryKey],
  );

  const deleteLink = useCallback(
    async (id: string) => {
      const updated = links.filter((link) => link.id !== id);
      saveLocalLinks(updated);
      queryClient.setQueryData(queryKey, updated);

      if (token) {
        await pushToGitHub(updated, token);
      }
    },
    [links, token, queryClient, queryKey],
  );

  return { links, isLoading, addLink, deleteLink, refetch };
}
