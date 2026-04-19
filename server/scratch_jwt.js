const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'john@mcbauchemie.com' } });
  if (!user) return console.log("User not found");
  
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.fullName },
    process.env.JWT_SECRET || 'nexus-hrm-local-secret-key-2025-v1',
    { expiresIn: '1h' }
  );
  console.log("TOKEN=" + token);
}

main().catch(console.error).finally(() => prisma.$disconnect());
