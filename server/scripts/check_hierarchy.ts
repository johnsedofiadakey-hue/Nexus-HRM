
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      fullName: true,
      role: true,
      supervisorId: true
    }
  });

  console.log('--- User Hierarchy Check ---');
  users.forEach(u => {
    console.log(`[${u.role}] ${u.fullName} (${u.id}) -> Supervisor: ${u.supervisorId}`);
  });

  const roots = users.filter(u => !u.supervisorId);
  console.log('\n--- Roots (No Supervisor) ---');
  roots.forEach(r => console.log(`[${r.role}] ${r.fullName}`));

  const orphans = users.filter(u => u.supervisorId && !users.find(p => p.id === u.supervisorId));
  console.log('\n--- Orphans (Invalid Supervisor ID) ---');
  orphans.forEach(o => console.log(`[${o.role}] ${o.fullName} reports to non-existent ${o.supervisorId}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
