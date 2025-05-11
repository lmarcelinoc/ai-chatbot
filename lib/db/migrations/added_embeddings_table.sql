-- Create pgvector extension if it doesn't exist (uncomment if you want to use vector embeddings)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS "Embeddings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "resourceId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster text search
CREATE INDEX IF NOT EXISTS "idx_embeddings_content" ON "Embeddings" USING GIN (to_tsvector('english', "content")); 