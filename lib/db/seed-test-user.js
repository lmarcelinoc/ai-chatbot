const { generateHashedPassword } = require('./utils');
const postgres = require('postgres');
const { v4: uuidv4 } = require('uuid');

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

async function seedTestUser() {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';
  const hashedPassword = generateHashedPassword(testPassword);

  try {
    console.log('Checking if test user exists...');
    const existingUsers = await sql`
      SELECT * FROM "User" WHERE email = ${testEmail}
    `;

    if (existingUsers.length > 0) {
      console.log('Test user already exists, updating password...');
      await sql`
        UPDATE "User" 
        SET password = ${hashedPassword}
        WHERE email = ${testEmail}
      `;
      console.log('Test user password updated');
    } else {
      console.log('Creating test user...');
      await sql`
        INSERT INTO "User" (id, email, password, role)
        VALUES (${uuidv4()}, ${testEmail}, ${hashedPassword}, 'user')
      `;
      console.log('Test user created successfully');
    }

    console.log('Test user details:');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the migration
seedTestUser();
