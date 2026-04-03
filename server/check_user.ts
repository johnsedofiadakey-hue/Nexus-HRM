import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'md@nexus.com' } });
  console.log(JSON.stringify(user, null, 2));
}
main();
