const fs = require('fs');
const path = require('path');

const prismaPath = path.join(__dirname, '..', 'server', 'prisma', 'schema.prisma');

if (!fs.existsSync(prismaPath)) {
  console.error('Error: schema.prisma not found at', prismaPath);
  process.exit(1);
}

// 1. Swap provider in schema.prisma to postgresql
let schema = fs.readFileSync(prismaPath, 'utf8');
schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
fs.writeFileSync(prismaPath, schema);
console.log('✅ Swapped schema.prisma to postgresql provider for production');

console.log('\n--- NEXT STEPS ON RENDER ---');
console.log('1. npx prisma generate');
console.log('2. npx tsc');
