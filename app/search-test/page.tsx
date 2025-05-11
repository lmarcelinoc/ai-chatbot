'use client';

import { useState } from 'react';
import { MessageWithSearch } from '@/components/message-with-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SearchTest() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!query.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `Search for: ${query}`, id: Date.now() },
    ]);

    setLoading(true);

    try {
      // Simulate AI response with search results
      // In a real app, this would come from the API
      const mockToolInvocations = [
        {
          toolName: 'braveSearch',
          state: 'result',
          result: {
            query: query,
            links: [
              {
                title: 'Example Result 1',
                url: 'https://example.com/1',
                description: `This is the first example search result about ${query}`,
              },
              {
                title: 'Example Result 2',
                url: 'https://example.com/2',
                description: `This is the second example search result with more information about ${query}`,
              },
              {
                title: 'Example Result 3',
                url: 'https://example.org',
                description:
                  'A third example showing how multiple search results appear in the sidebar',
              },
            ],
          },
        },
      ];

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Here's what I found about "${query}". I've searched the web and found some relevant information. Click on "Sources" to see the details.`,
          id: Date.now() + 1,
          toolInvocations: mockToolInvocations,
        },
      ]);

      setQuery('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Web Search Test</h1>

      <div className="border rounded-lg p-4 h-[500px] mb-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 p-3 rounded-lg ${
              message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <div className="font-bold mb-1">
              {message.role === 'user' ? 'You' : 'AI Assistant'}:
            </div>

            {message.role === 'assistant' ? (
              <MessageWithSearch
                message={message}
                content={message.content}
                toolInvocations={message.toolInvocations}
              />
            ) : (
              <div>{message.content}</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="p-3 rounded-lg bg-gray-100">
            <div className="font-bold mb-1">AI Assistant:</div>
            <div className="flex space-x-2">
              <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" />
              <div
                className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a search query..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          Search
        </Button>
      </form>
    </div>
  );
}
