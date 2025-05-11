import 'server-only';
import { embeddings } from '../db/schema';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create a postgres client specifically for vector search
const searchClient = postgres(process.env.POSTGRES_URL ?? '');
// Create a drizzle instance for database queries
const searchDb = drizzle(searchClient);

/**
 * Searches for similar document chunks based on a query
 * Requires pgvector extension to be enabled in the database
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Array of document chunks with similarity scores
 */
export async function searchSimilarDocuments(query: string, limit = 5) {
  try {
    // For now, we're using a simple text search without embeddings
    // until the embedding functionality is properly implemented
    const results = await searchDb.execute(sql`
      SELECT 
        id,
        content,
        "resourceId",
        0 as similarity 
      FROM ${embeddings}
      WHERE content ILIKE ${`%${query}%`}
      LIMIT ${limit}
    `);

    return results.map((result: any) => ({
      id: result.id,
      content: result.content,
      resourceId: result.resourceId,
      similarity: result.similarity ?? 0,
    }));
  } catch (error) {
    console.error('Error searching for documents:', error);
    return [];
  }
}

/**
 * Save this implementation for future use once embeddings are properly set up
 */
/*
async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data[0].embedding;
}
*/
