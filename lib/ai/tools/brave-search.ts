import { z } from 'zod';
import { getSystemSettings } from '@/lib/db/queries';
import { tool } from 'ai';

// Brave Search API documentation: https://brave.com/search/api/

export async function performBraveSearch({
  query,
  count = 5,
}: {
  query: string;
  count?: number;
}) {
  try {
    // First check environment variables for API key
    let apiKey = process.env.BRAVE_SEARCH_API_KEY;

    // If not found in environment, check database settings
    if (!apiKey) {
      const settings = await getSystemSettings();
      apiKey = settings?.braveSearchApiKey || undefined;
    }

    if (!apiKey) {
      throw new Error(
        'Brave Search API key is not configured. Please configure it in the admin settings.',
      );
    }

    // Make request to Brave Search API
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      },
    );

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text(); // Try to get text body for more details
      } catch (e) {
        // Ignore if we can't read the body
      }
      console.error('Brave Search API Error Response Body:', errorBody);
      throw new Error(
        `Brave Search API error: ${response.statusText} (Status: ${response.status}). ${errorBody ? `Details: ${errorBody}` : ''}`,
      );
    }

    const data = await response.json();

    // Extract and format search results
    const results = data.web?.results || [];

    return {
      links: results.map((result: any) => ({
        title: result.title,
        url: result.url,
        description: result.description,
      })),
      query: query,
      content: `Web search results for "${query}"`,
    };
  } catch (error) {
    console.error('Error in Brave search:', error);
    return {
      links: [],
      query: query,
      error:
        error instanceof Error ? error.message : 'Unknown error during search',
      content: `Error searching the web: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Formats search results in a human-readable markdown format
 */
function formatSearchResults(query: string, results: any[]) {
  if (!results || results.length === 0) {
    return "I couldn't find any relevant results for your query.";
  }

  // Create a user-friendly formatted response with markdown
  return `## Web Search Results for "${query}"

${results
  .map((result, index) => {
    return `### ${index + 1}. ${result.title}

${result.description}

**Source:** [${new URL(result.url).hostname}](${result.url})
`;
  })
  .join('\n')}

*Results provided by Brave Search*`;
}

// Schema for Brave Search parameters
export const braveSearchSchema = z.object({
  query: z.string().describe('The search query to look up information online'),
  count: z
    .number()
    .optional()
    .describe('Number of results to return (default: 5)'),
});

// Export the tool for use with AI SDK
export const braveSearch = tool({
  description: 'Search the web for real-time information about any topic',
  parameters: braveSearchSchema,
  execute: performBraveSearch,
});
