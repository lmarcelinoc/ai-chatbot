// Simple script to create a new user
const { exec } = require('node:child_process');
const path = require('node:path');

// Compiling the TypeScript file
console.log('Compiling TypeScript...');
exec('npx tsx scripts/create-user.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }

  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }

  console.log(stdout);
});
