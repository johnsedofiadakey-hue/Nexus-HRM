const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { email: 'md@nexus.com' } });
  console.log(JSON.stringify(users, null, 2));
}
main();
