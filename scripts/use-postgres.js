const fs = require('fs');
const path = require('path');

// Support running from root or from scripts/
const rootDir = process.cwd().endsWith('scripts') ? path.join(process.cwd(), '..') : process.cwd();
const prismaPath = path.join(rootDir, 'server', 'prisma', 'schema.prisma');

console.log('--- DB PROVIDER SWAP ---');
console.log('Target path:', prismaPath);

if (!fs.existsSync(prismaPath)) {
  console.error('❌ Error: schema.prisma not found at', prismaPath);
  process.exit(1);
}

// 1. Swap provider in schema.prisma to postgresql
let schema = fs.readFileSync(prismaPath, 'utf8');
const originalLength = schema.length;

// Robust regex for provider replacement (handles single/double quotes and whitespace)
schema = schema.replace(/provider\s*=\s*["']sqlite["']/g, 'provider = "postgresql"');

if (schema.includes('provider = "postgresql"')) {
  fs.writeFileSync(prismaPath, schema);
  console.log('✅ SUCCESSFULLY swapped schema.prisma to postgresql provider');
} else {
  console.error('❌ FAILED to swap provider. "sqlite" not found or already changed.');
  // Don't exit 1 if it's already postgresql
  if (schema.includes('provider = "postgresql"')) {
      console.log('✓ Provider was already postgresql');
  } else {
      process.exit(1);
  }
}

console.log('--- NEXT STEPS ---');
console.log('1. cd server');
console.log('2. npx prisma generate');
