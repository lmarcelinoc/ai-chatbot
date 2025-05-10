// Load environment variables
require('dotenv').config();

// Run the transpiled TypeScript code
require('./dist/lib/db/seed-providers');

console.log('Seeding database with providers and models...'); 