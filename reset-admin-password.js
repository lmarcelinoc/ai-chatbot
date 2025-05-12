const postgres = require('postgres');

// The email and new password for the admin user
const EMAIL = 'lmarcelinoc@gmail.com';
const NEW_PASSWORD = 'adminpassword123'; // Change this to your desired password

async function resetAdminPassword() {
  try {
    // Dynamically import bcrypt-ts
    const bcryptTs = await import('bcrypt-ts');

    // Get the POSTGRES_URL from environment
    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      console.error('POSTGRES_URL environment variable is not set');
      process.exit(1);
    }

    console.log('Connecting to database...');
    const sql = postgres(POSTGRES_URL);

    // Get the user from the database
    console.log(`Fetching user with email: ${EMAIL}`);
    const users = await sql`SELECT * FROM "User" WHERE email = ${EMAIL}`;

    if (users.length === 0) {
      console.error('User not found');
      process.exit(1);
    }

    const user = users[0];
    console.log(`User found: ${user.id} (${user.email})`);

    // Generate new password hash
    console.log('Generating new password hash...');
    const newPasswordHash = await bcryptTs.hash(NEW_PASSWORD, 10);

    // Update the user's password
    console.log('Updating password...');
    await sql`
      UPDATE "User"
      SET password = ${newPasswordHash}
      WHERE id = ${user.id}
    `;

    console.log(`Password updated successfully for user: ${user.email}`);
    console.log(`New password is: ${NEW_PASSWORD}`);
    console.log('Please use this new password to log in');

    await sql.end();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetAdminPassword();
