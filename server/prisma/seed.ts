import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Clear old data (Order matters because of relations)
  await prisma.kpiItem.deleteMany();
  await prisma.kpiSheet.deleteMany();
  await prisma.leaveRequest.deleteMany(); // Clear leaves too
  await prisma.auditLog.deleteMany();     // Clear audit logs
  await prisma.user.deleteMany();

  console.log('🗑️  Old data cleared.');

  // 2. Create Password Hash
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('nexus123', salt);

  // 3. Create MD (Richard)
  const md = await prisma.user.create({
    data: {
      fullName: 'Richard Sterling',
      email: 'admin@nexus.com',
      passwordHash: hashedPassword,  // UPDATED FIELD NAME
      jobTitle: 'Managing Director',
      department: 'Executive',
      role: Role.MD,                 // UPDATED ENUM
      avatarUrl: 'https://i.pravatar.cc/150?u=richard',
    },
  });

  // 4. Create Manager (Sarah)
  const manager = await prisma.user.create({
    data: {
      fullName: 'Sarah Connor',
      email: 'sarah@nexus.com',
      passwordHash: hashedPassword,
      jobTitle: 'Sales Manager',
      department: 'Sales',
      role: Role.SUPERVISOR,
      supervisorId: md.id,
      avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
    },
  });

  // 5. Create Employee (John)
  const employee = await prisma.user.create({
    data: {
      fullName: 'John Doe',
      email: 'john@nexus.com',
      passwordHash: hashedPassword,
      jobTitle: 'Sales Associate',
      department: 'Sales',
      role: Role.EMPLOYEE,
      supervisorId: manager.id,
      avatarUrl: 'https://i.pravatar.cc/150?u=john',
    },
  });

  console.log('✅ Database Seeded! Login with email and pass "nexus123"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });