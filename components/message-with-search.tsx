'use client';

import { WebSearchResults, type SearchResultItem } from './web-search-results';
import { useEffect, useState } from 'react';

interface MessageWithSearchProps {
  message: any; // Adjust based on your message type
  content: string;
  toolInvocations?: any[];
}

export function MessageWithSearch({
  message,
  content,
  toolInvocations = [],
}: MessageWithSearchProps) {
  const [searchResults, setSearchResults] = useState<{
    results: SearchResultItem[];
    query: string;
  } | null>(null);

  useEffect(() => {
    // Process tool invocations to extract search results
    const searchInvocation = toolInvocations?.find(
      (inv) => inv.toolName === 'braveSearch' && inv.state === 'result',
    );

    if (searchInvocation?.result) {
      const result = searchInvocation.result;

      if (result.links && result.query) {
        setSearchResults({
          results: result.links,
          query: result.query,
        });
      }
    }
  }, [toolInvocations]);

  return (
    <div className="message-container">
      {/* Regular message content */}
      <div className="message-content whitespace-pre-wrap">{content}</div>

      {/* Render search results if available */}
      {searchResults && searchResults.results.length > 0 && (
        <div className="mt-2">
          <WebSearchResults
            results={searchResults.results}
            query={searchResults.query}
          />
        </div>
      )}
    </div>
  );
}
