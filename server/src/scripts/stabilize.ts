import prisma from '../prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('--- SYSTEM STABILIZATION & SEEDING START ---');

  const MAIN_TENANT = 'default-tenant';

  // 1. Ensure Main Organization Exists
  const mainOrg = await prisma.organization.upsert({
    where: { id: MAIN_TENANT },
    update: {},
    create: {
      id: MAIN_TENANT,
      name: 'Nexus HRM',
      isEnterprise: true,
    }
  });
  console.log('Main Organization:', mainOrg.name);

  // 2. Seed Managing Director (MD)
  const mdEmail = 'admin@nexushrm.com';
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const mdUser = await prisma.user.upsert({
    where: { email: mdEmail },
    update: { organizationId: MAIN_TENANT, role: 'MD' },
    create: {
      email: mdEmail,
      fullName: 'Managing Director',
      passwordHash: hashedPassword,
      role: 'MD',
      organizationId: MAIN_TENANT,
      status: 'ACTIVE',
      jobTitle: 'Managing Director'
    }
  });
  console.log('MD User Synced:', mdUser.email);

  // 3. Seed DEV Account (Part 6)
  const devEmail = 'dev@nexushrm.com';
  await prisma.user.upsert({
    where: { email: devEmail },
    update: { organizationId: null, role: 'DEV' },
    create: {
      email: devEmail,
      fullName: 'Nexus Developer',
      passwordHash: hashedPassword,
      role: 'DEV',
      organizationId: null,
      status: 'ACTIVE',
      jobTitle: 'Lead Developer'
    }
  });
  console.log('DEV User Synced: NULL context.');

  // 4. Seed Standard Departments (Part 7)
  const standardDepts = ['Human Resources', 'Finance', 'Operations', 'Sales'];
  for (const name of standardDepts) {
    const exists = await prisma.department.findFirst({
      where: { name, organizationId: MAIN_TENANT }
    });
    if (!exists) {
      await prisma.department.create({
        data: { name, organizationId: MAIN_TENANT }
      });
      console.log(`Created department: ${name}`);
    }
  }

  // 5. Standardize Data Consistency (Part 5)
  console.log('Patching orphan records...');
  await prisma.department.updateMany({
    where: { organizationId: 'default-org' },
    data: { organizationId: MAIN_TENANT }
  });
  
  await prisma.departmentKPI.updateMany({
    where: { organizationId: 'default-org' },
    data: { organizationId: MAIN_TENANT }
  });

  console.log('--- STABILIZATION COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
