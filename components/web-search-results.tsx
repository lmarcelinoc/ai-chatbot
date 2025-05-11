'use client';

import { useState } from 'react';
import { ExternalLink, Globe, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
}

export interface WebSearchResultsProps {
  results: SearchResultItem[];
  query: string;
}

export function WebSearchResults({ results, query }: WebSearchResultsProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!results || results.length === 0) {
    return (
      <div className="mt-1 border border-muted/40 rounded-lg p-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
        <Search className="h-3 w-3" />
        <span>No results found for &quot;{query}&quot;</span>
      </div>
    );
  }

  // Group results by domain for compact view
  const domains = results.reduce(
    (acc, result) => {
      const hostname = new URL(result.url).hostname;
      const domain = hostname.replace(/^www\./, '');
      if (!acc[domain]) {
        acc[domain] = [];
      }
      acc[domain].push(result);
      return acc;
    },
    {} as Record<string, SearchResultItem[]>,
  );

  return (
    <>
      {/* Compact "Sources" indicator */}
      <button
        type="button"
        className="mt-1 rounded-md p-1.5 text-xs cursor-pointer transition-colors bg-zinc-800 hover:bg-zinc-700 flex items-center gap-2"
        onClick={() => setSidebarOpen(true)}
      >
        <div className="flex items-center">
          {Object.keys(domains)
            .slice(0, 4)
            .map((domain, index) => (
              <div
                key={domain}
                className="w-5 h-5 relative flex-shrink-0"
                style={{ marginLeft: index > 0 ? '-6px' : '0' }}
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt=""
                  className="w-full h-full object-contain rounded-full border border-zinc-700 bg-zinc-900"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
        </div>
        <span className="text-zinc-400">Sources</span>
      </button>

      {/* Sidebar with detailed results */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Sources for &quot;{query}&quot;
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {results.map((result, index) => {
              const hostname = new URL(result.url).hostname;
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

              return (
                <div
                  key={`${result.url}-${index}`}
                  className="border border-muted/40 rounded-lg overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 relative flex-shrink-0">
                        <img
                          src={faviconUrl}
                          alt=""
                          className="w-full h-full relative z-10 object-contain rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove(
                              'hidden',
                            );
                          }}
                        />
                        <Globe className="h-5 w-5 text-muted-foreground absolute inset-0 hidden" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{result.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {hostname}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {result.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(result.url, '_blank')}
                    >
                      Visit <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-center text-muted-foreground border-t border-muted/20 pt-2">
            Results from Brave Search
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
