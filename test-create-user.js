// Script to test the user creation API endpoint
const { execSync } = require('node:child_process');

// Generate a unique email with timestamp
const timestamp = new Date().getTime();
const email = `user${timestamp}@example.com`;
const password = 'SecurePassword123';

console.log(`Creating user with email: ${email}`);

// Using curl command through execSync
try {
  const command = `curl -s -X POST http://localhost:3000/api/create-user -H "Content-Type: application/json" -d '{"email":"${email}","password":"${password}"}'`;

  console.log('Executing command...');
  const result = execSync(command).toString();

  try {
    const data = JSON.parse(result);
    if (data.success) {
      console.log('User created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('You can now login with these credentials');
    } else {
      console.error('Failed to create user:', data.error);
    }
  } catch (parseError) {
    console.error('Error parsing response:', result);
  }
} catch (error) {
  console.error('Error executing command:', error.message);
  console.error('Make sure your Next.js server is running on port 3000');
}
