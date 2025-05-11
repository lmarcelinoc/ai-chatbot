const fs = require('node:fs');
const path = require('node:path');
const postgres = require('postgres');

// Get database URL from environment variables
const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

// Create a postgres client with SSL required
const sql = postgres(databaseUrl, {
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  try {
    console.log('⏳ Running embeddings migration...');

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      'lib/db/migrations/added_embeddings_table.sql',
    );
    const migration = fs.readFileSync(migrationPath, 'utf8');

    // Run the migration
    await sql.unsafe(migration);

    console.log('✅ Embeddings migration completed successfully');
  } catch (error) {
    console.error('❌ Error running embeddings migration:', error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the migration
runMigration();
