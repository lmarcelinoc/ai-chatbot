const postgres = require('postgres');
const bcrypt = require('bcrypt');

// Add the password to check here
const email = 'lmarcelinoc@gmail.com';
const password = 'La01347930'; // The password from network logs

async function debugAuth() {
  try {
    // Get the POSTGRES_URL from environment
    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      console.error('POSTGRES_URL not found in environment');
      process.exit(1);
    }

    console.log('Connecting to database...');
    const sql = postgres(POSTGRES_URL);

    // Get the user from the database
    console.log(`Fetching user with email: ${email}`);
    const users = await sql`SELECT * FROM "User" WHERE email = ${email}`;

    if (users.length === 0) {
      console.error('User not found');
      process.exit(1);
    }

    const user = users[0];
    console.log(`User found: ${user.email}`);
    console.log(`Password hash length: ${user.password?.length || 0}`);

    // Debug information
    console.log('\n--- Stored Password Info ---');
    if (user.password) {
      console.log(`Hash: ${user.password}`);
      console.log(`Length: ${user.password.length}`);
      console.log(`First 10 chars: ${user.password.substring(0, 10)}...`);
    } else {
      console.log('No password stored');
    }

    // Test with both bcrypt libraries
    if (user.password) {
      console.log('\n--- Authentication Tests ---');

      // Use dynamic import for bcrypt-ts
      console.log('Importing bcrypt-ts...');
      const bcryptTs = await import('bcrypt-ts');

      console.log('Testing with bcrypt-ts:');
      try {
        const bcryptTsMatch = await bcryptTs.compare(password, user.password);
        console.log(`bcrypt-ts match result: ${bcryptTsMatch}`);
      } catch (err) {
        console.error('bcrypt-ts compare error:', err.message);
      }

      console.log('\nTesting with bcrypt:');
      try {
        const bcryptMatch = await bcrypt.compare(password, user.password);
        console.log(`bcrypt match result: ${bcryptMatch}`);
      } catch (err) {
        console.error('bcrypt compare error:', err.message);
      }
    }

    // Create hashes with both libraries for comparison
    console.log('\n--- Test Hash Generation ---');
    const bcryptTs = await import('bcrypt-ts');
    const bcryptTsHash = await bcryptTs.hash(password, 10);
    const bcryptHash = await bcrypt.hash(password, 10);

    console.log(
      `bcrypt-ts hash: ${bcryptTsHash} (length: ${bcryptTsHash.length})`,
    );
    console.log(`bcrypt hash: ${bcryptHash} (length: ${bcryptHash.length})`);

    // Clean up
    await sql.end();
  } catch (error) {
    console.error('Error debugging auth:', error);
  }
}

debugAuth();
