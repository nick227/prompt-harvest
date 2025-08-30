#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Environment Configuration Check\n');

// Check if .env file exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('DATABASE_URL')) {
        console.log('✅ DATABASE_URL found in .env');
        const match = envContent.match(/DATABASE_URL="([^"]+)"/);
        if (match) {
            console.log(`📋 Current DATABASE_URL: ${match[1]}`);
        }
    } else {
        console.log('❌ DATABASE_URL not found in .env');
    }
} else {
    console.log('❌ .env file not found');
    console.log('\n📋 Creating .env file with default configuration...');
    
    const defaultEnv = `# Database Configuration
DATABASE_URL="mysql://root:@localhost:3306/image_harvest"

# Server Configuration
PORT=3200
HOST=localhost
NODE_ENV=development

# Authentication Configuration
SESSION_SECRET=your-secret-key-change-in-production
BCRYPT_ROUNDS=12

# AI/OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
`;
    
    fs.writeFileSync(envPath, defaultEnv);
    console.log('✅ .env file created with default configuration');
}

// Check current environment variables
console.log('\n🔍 Current Environment Variables:');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL || 'Not set'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);

console.log('\n📋 Next Steps:');
console.log('1. Make sure MySQL is running in WAMP64');
console.log('2. Create database "image_harvest" in phpMyAdmin');
console.log('3. Update DATABASE_URL in .env if needed');
console.log('4. Run: npm run db:migrate');
