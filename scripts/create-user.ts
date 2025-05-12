import { createUser } from '../lib/db/queries';

// Generate a username and password
const email = 'admin@admin.com';
const password = 'SecurePassword123';

async function main() {
  try {
    console.log(`Creating user with email: ${email}`);
    await createUser(email, password);
    console.log('User created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    process.exit(0);
  } catch (error) {
    console.error('Failed to create user:', error);
    process.exit(1);
  }
}

main();
