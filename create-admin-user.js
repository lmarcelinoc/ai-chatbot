// Directly create an admin user in the database using postgres.js
require('dotenv').config();
const postgres = require('postgres');

// User details - CHANGE THESE AS NEEDED
const email = 'admin@example.com';
const password = 'Admin123!@#';
const role = 'admin';

async function createAdminUser() {
  try {
    console.log(`Creating admin user: ${email}`);

    // Dynamically import bcrypt-ts
    const bcrypt = await import('bcrypt-ts');

    // Hash the password using bcrypt
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Get connection string from environment variables
    let connectionString =
      process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

    if (!connectionString) {
      console.error(
        'No database connection string found in environment variables!',
      );
      console.error('Make sure your .env file has POSTGRES_URL set correctly');
      process.exit(1);
    }

    // Ensure SSL is enabled for the connection
    if (!connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?')
        ? '&sslmode=require'
        : '?sslmode=require';
    }

    console.log('Connecting to database...');

    // Create the PostgreSQL connection
    const sql = postgres(connectionString, {
      prepare: false,
      ssl: true, // Force SSL to be enabled
      connect_timeout: 15,
    });

    try {
      // Check if user already exists
      console.log('Checking if user exists...');
      const existingUsers = await sql`
        SELECT * FROM "User" WHERE email = ${email}
      `;

      if (existingUsers.length > 0) {
        console.log('User with this email already exists');
        process.exit(0);
      }

      // Insert the new user
      console.log('Creating user in database...');
      await sql`
        INSERT INTO "User" (id, email, password, role)
        VALUES (
          gen_random_uuid(),
          ${email},
          ${hashedPassword},
          ${role}
        )
      `;

      console.log('Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role:', role);
      console.log('You can now login with these credentials');
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      // Close the connection
      await sql.end();
    }
  } catch (err) {
    console.error('Failed to import bcrypt-ts:', err);
  }
}

createAdminUser();
