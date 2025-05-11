const postgres = require('postgres');
const fs = require('node:fs');
const path = require('node:path');

// Get database URL from environment variables
const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

// Create a postgres client
const sql = postgres(databaseUrl, {
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

async function runMigration() {
  try {
    console.log('Running password field length migration...');

    // Read the SQL file
    const migrationPath = path.join(
      __dirname,
      'lib',
      'db',
      'migrations',
      'password_length_update.sql',
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL
    await sql.unsafe(migrationSQL);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

runMigration();
