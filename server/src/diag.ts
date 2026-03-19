import prisma from './prisma/client';

async function main() {
  const settings = await prisma.systemSettings.findMany();
  console.log('--- ALL SYSTEM SETTINGS ---');
  console.log(JSON.stringify(settings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
