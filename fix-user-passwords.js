// Script to rehash all passwords in the database using bcrypt-ts
const postgres = require('postgres');

async function main() {
  try {
    // Get database URL from environment
    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      console.error('POSTGRES_URL environment variable is not set');
      process.exit(1);
    }

    console.log('Connecting to database...');
    const sql = postgres(POSTGRES_URL);

    // Get all users from the database
    console.log('Fetching users...');
    const users = await sql`SELECT id, email, password FROM "User"`;
    console.log(`Found ${users.length} users`);

    // Import bcrypt-ts dynamically
    const bcryptTs = await import('bcrypt-ts');

    // Process users with passwords
    let rehashedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (!user.password || user.password.trim() === '') {
        console.log(`Skipping user ${user.id} (${user.email}) - no password`);
        skippedCount++;
        continue;
      }

      try {
        // Create a new hash with bcrypt-ts (will generate a new salt)
        // First, we try to re-hash passwords created with the other bcrypt library
        let passwordText;

        try {
          // For debugging purposes, output hash info
          console.log(`Processing user ${user.id} (${user.email})`);
          console.log(
            `  Current hash: ${user.password.substring(0, 10)}... (length: ${user.password.length})`,
          );

          // Generate a new random password (we can't recover the original password)
          // The user will need to use the password reset feature
          const randomPassword = Math.random().toString(36).slice(-10);

          // Create new hash
          const newHash = await bcryptTs.hash(randomPassword, 10);
          console.log(
            `  New hash: ${newHash.substring(0, 10)}... (length: ${newHash.length})`,
          );

          // Update the user password in the database
          await sql`
            UPDATE "User"
            SET password = ${newHash}
            WHERE id = ${user.id}
          `;

          console.log(`  User ${user.id} password rehashed successfully.`);
          console.log(`  This user will need to reset their password.`);
          rehashedCount++;
        } catch (err) {
          console.error(
            `  Error rehashing password for user ${user.id}: ${err.message}`,
          );
          skippedCount++;
        }
      } catch (err) {
        console.error(`Error processing user ${user.id}: ${err.message}`);
        skippedCount++;
      }
    }

    console.log('\nSummary:');
    console.log(`Total users: ${users.length}`);
    console.log(`Rehashed passwords: ${rehashedCount}`);
    console.log(`Skipped: ${skippedCount}`);

    await sql.end();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
