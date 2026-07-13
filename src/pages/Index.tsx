import { useState, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Plus, ExternalLink, Trash2, Link as LinkIcon, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinks, type LinkItem } from '@/hooks/useLinks';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const Index = () => {
  useSeoMeta({
    title: 'My Dance Links',
    description: 'A simple link manager — save and organize your favorite URLs.',
  });

  const { user } = useCurrentUser();
  const { links, isLoading, addLink, deleteLink } = useLinks();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();

    if (!trimmedLabel || !trimmedUrl) return;

    let finalUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    if (!isValidUrl(finalUrl)) return;

    setAdding(true);
    try {
      await addLink(trimmedLabel, finalUrl);
      setLabel('');
      setUrl('');
    } finally {
      setAdding(false);
    }
  }, [label, url, addLink]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteLink(id);
    },
    [deleteLink],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">My Links</h1>
              <p className="text-sm text-muted-foreground">
                {user
                  ? 'Saved to your Nostr account — synced everywhere'
                  : 'Saved to this device — log in with Nostr to sync'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        {/* Add Link Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Add a Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Label (e.g. My Website)"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Link label"
                  disabled={adding}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="URL (e.g. example.com)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Link URL"
                  disabled={adding}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={!label.trim() || !url.trim() || adding}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Links List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="py-4">
                <CardContent className="px-5 py-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <LinkIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1">
              No links yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Add your first link above and it will show up here
              {user ? ', synced to your Nostr account.' : '.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {links.map((link: LinkItem) => (
              <li key={link.id}>
                <Card className="py-4">
                  <CardContent className="px-5 py-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2"
                        >
                          <span className="font-medium text-sm truncate group-hover:underline">
                            {link.label}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                        </a>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {link.url}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(link.id)}
                        aria-label={`Delete ${link.label}`}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <p className="text-xs text-center text-muted-foreground">
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Vibed with Shakespeare
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
