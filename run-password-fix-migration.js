const fs = require('node:fs');
const path = require('node:path');
const postgres = require('postgres');

// Read the environment variables
// We're not using dotenv here to avoid any complications
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('Connecting to the database...');
    const sql = postgres(POSTGRES_URL);

    console.log('Reading migration file...');
    const migrationFilePath = path.join(
      process.cwd(),
      'lib/db/migrations/fix_password_length.sql',
    );
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');

    console.log('Running migration...');
    await sql.unsafe(migrationSql);

    console.log('Migration completed successfully!');
    console.log('Password column length has been increased to 100 characters.');
    await sql.end();
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
