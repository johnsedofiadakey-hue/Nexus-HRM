
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const depts = await prisma.department.findMany({ 
    where: { 
      OR: [
        { name: '1' },
        { name: '2' },
        { name: '3' }
      ]
    } 
  });
  console.log('Found depts:', depts);
  for (const d of depts) {
    const users = await prisma.user.count({ where: { departmentId: d.id } });
    if (users === 0) {
      console.log('Deleting empty department:', d.name);
      await prisma.department.delete({ where: { id: d.id } });
    } else {
      console.log('Department', d.name, 'has users, renaming to DUMMY_' + d.name);
      await prisma.department.update({ where: { id: d.id }, data: { name: 'DUMMY_' + d.name } });
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
