import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  const orgId = 'default-tenant';

  // 1. Ensure Organization exists
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: 'Nexus Default Tenant' }
  });

  // 2. Fetch or create MD
  const md = await prisma.user.findFirst({ where: { email: 'md@nexus.com' } });
  if (!md) {
      console.log('MD user not found, skipping relative seeds');
      return;
  }

  // 3. Departments
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources', organizationId: orgId, managerId: md.id }
  });
  const techDept = await prisma.department.create({
    data: { name: 'Technology', organizationId: orgId, managerId: md.id }
  });

  // 4. Test Employees
  const emp1 = await prisma.user.create({
    data: {
      email: 'john.doe@nexus.test',
      fullName: 'John Doe',
      passwordHash: md.passwordHash, // reuse MD password for test
      role: 'STAFF',
      jobTitle: 'HR Specialist',
      organizationId: orgId,
      departmentId: hrDept.id,
      supervisorId: md.id
    }
  });

  const emp2 = await prisma.user.create({
    data: {
      email: 'jane.smith@nexus.test',
      fullName: 'Jane Smith',
      passwordHash: md.passwordHash,
      role: 'MANAGER',
      jobTitle: 'Engineering Manager',
      organizationId: orgId,
      departmentId: techDept.id,
      supervisorId: md.id
    }
  });

  // 5. KPIs
  await prisma.departmentKPI.create({
    data: {
      organizationId: orgId,
      departmentId: techDept.id,
      title: 'System Uptime',
      metricType: 'PERCENT',
      targetValue: 99.9,
      measurementPeriod: 'Q1-2026',
      assignedById: md.id,
      status: 'ACTIVE'
    }
  });

  // 6. KPI Sheets
  await prisma.kpiSheet.create({
    data: {
      organizationId: orgId,
      employeeId: emp1.id,
      reviewerId: md.id,
      month: 3,
      year: 2026,
      title: 'Q1 Performance Goal',
      status: 'ACTIVE',
      items: {
        create: [
          { organizationId: orgId, name: 'Employee Retention', weight: 50, targetValue: 90, actualValue: 0, score: 0 },
          { organizationId: orgId, name: 'Training Completion', weight: 50, targetValue: 100, actualValue: 0, score: 0 }
        ]
      }
    }
  });

  console.log('✅ Seeding complete.');
}

seed()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
