import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Clear old data (Order matters because of relations)
  await prisma.appraisalRating.deleteMany();
  await prisma.appraisal.deleteMany();
  await prisma.competency.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.kpiItem.deleteMany();
  await prisma.kpiSheet.deleteMany();
  await prisma.leaveRequest.deleteMany(); // Clear leaves too
  await prisma.auditLog.deleteMany();     // Clear audit logs
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log('🗑️  Old data cleared.');

  // 2. Create Password Hash
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('nexus123', salt);

  // 3. Create Departments
  const executiveDept = await prisma.department.create({
    data: {
      name: 'Executive',
    },
  });

  const salesDept = await prisma.department.create({
    data: {
      name: 'Sales',
    },
  });

  // 4. Create MD (Richard)
  const md = await prisma.user.create({
    data: {
      fullName: 'Richard Sterling',
      email: 'admin@nexus.com',
      passwordHash: hashedPassword,  // UPDATED FIELD NAME
      jobTitle: 'Managing Director',
      departmentId: executiveDept.id,
      role: Role.MD,                 // UPDATED ENUM
      avatarUrl: 'https://i.pravatar.cc/150?u=richard',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
    },
  });

  // 5. Create Manager (Sarah)
  const manager = await prisma.user.create({
    data: {
      fullName: 'Sarah Connor',
      email: 'sarah@nexus.com',
      passwordHash: hashedPassword,
      jobTitle: 'Sales Manager',
      departmentId: salesDept.id,
      role: Role.SUPERVISOR,
      supervisorId: md.id,
      avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
    },
  });

  // 6. Create Employee (John)
  const employee = await prisma.user.create({
    data: {
      fullName: 'John Doe',
      email: 'john@nexus.com',
      passwordHash: hashedPassword,
      jobTitle: 'Sales Associate',
      departmentId: salesDept.id,
      role: Role.EMPLOYEE,
      supervisorId: manager.id,
      avatarUrl: 'https://i.pravatar.cc/150?u=john',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
    },
  });

  // 7. Seed Competencies
  const competencies = [
    { name: 'Communication', description: 'Clear, timely, and professional communication', weight: 1.0 },
    { name: 'Delivery', description: 'Quality and on-time delivery of work', weight: 1.0 },
    { name: 'Collaboration', description: 'Teamwork and support of peers', weight: 1.0 },
    { name: 'Initiative', description: 'Ownership and proactive problem solving', weight: 1.0 }
  ];

  for (const comp of competencies) {
    await prisma.competency.create({ data: comp });
  }

  // 8. Create an ACTIVE cycle and initialize appraisals
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 90);

  const cycle = await prisma.cycle.create({
    data: {
      name: `Q1 ${now.getFullYear()}`,
      type: 'QUARTERLY',
      startDate: now,
      endDate,
      status: 'ACTIVE'
    }
  });

  const employees = [employee];
  for (const emp of employees) {
    const appraisal = await prisma.appraisal.create({
      data: {
        employeeId: emp.id,
        reviewerId: emp.supervisorId || manager.id,
        cycleId: cycle.id,
        status: 'PENDING_SELF'
      }
    });

    const seededCompetencies = await prisma.competency.findMany();
    for (const comp of seededCompetencies) {
      await prisma.appraisalRating.create({
        data: {
          appraisalId: appraisal.id,
          competencyId: comp.id
        }
      });
    }
  }

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