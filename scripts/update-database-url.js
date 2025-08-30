#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Updating Database Configuration\n');

const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update DATABASE_URL to use autoimage database
    const newDatabaseUrl = 'DATABASE_URL="mysql://root:@localhost:3306/autoimage"';
    
    // Replace existing DATABASE_URL or add new one
    if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL="[^"]*"/, newDatabaseUrl);
    } else {
        envContent = `# Database Configuration\n${newDatabaseUrl}\n\n${envContent}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated DATABASE_URL to use autoimage database');
    console.log(`📋 New DATABASE_URL: ${newDatabaseUrl}`);
} else {
    console.log('❌ .env file not found');
}

console.log('\n📋 Next Steps:');
console.log('1. Make sure MySQL is running in WAMP64');
console.log('2. Verify autoimage database exists');
console.log('3. Run: npm run db:migrate');
