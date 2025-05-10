import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database connection
let connectionString = process.env.POSTGRES_URL!;

// Determine which connection string to use
if (process.env.NODE_ENV === 'production' && process.env.POSTGRES_URL) {
  // For production, use the pooled connection
  connectionString = process.env.POSTGRES_URL;
  console.log('Using production pooled database connection');
} else if (process.env.POSTGRES_URL_NON_POOLING) {
  // For development and testing, use a non-pooled connection
  connectionString = process.env.POSTGRES_URL_NON_POOLING;
  console.log('Using non-pooled database connection');
} else if (process.env.POSTGRES_URL) {
  // Fallback to POSTGRES_URL if available
  console.log('Using fallback database connection');
} else {
  console.warn('No database connection string found in environment variables!');
  // In a real app, you might want to throw an error here
}

// Create the PostgreSQL connection with error handling
let client: ReturnType<typeof postgres>;
try {
  client = postgres(connectionString, {
    prepare: false,
    // SSL is enabled by default in production, but you can control it:
    ssl: process.env.POSTGRES_SSL === 'false' ? false : 
         process.env.NODE_ENV === 'production', 
    // Set connection timeout
    connect_timeout: 15,
  });
  
  console.log('Database client created successfully');
} catch (error) {
  console.error('Failed to create database client:', error);
  // Create a dummy client that will throw clear errors if used
  client = postgres('postgres://localhost:5432/dummy', { 
    prepare: false,
    connect_timeout: 1,
    idle_timeout: 1,
  });
}

// Export the database connection with drizzle ORM
export const db = drizzle(client);

// Optional health check function
export async function checkDatabaseConnection() {
  try {
    // Simple query to test connection
    await client`SELECT 1`;
    console.log('Database connection is healthy');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
} 