import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Seeding database (idempotent mode)...');

  // PROXIES & HELPERS
  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const devPasswordHash = await hash('DevMaster@2025!');
  const mdPasswordHash = await hash('Rich@2025');

  // 1. SYSTEM ADMIN (DEV MASTER)
  console.log('👤 Synchronizing System Developer (DEV)...');
  await prisma.user.upsert({
    where: { email: 'dev@nexus-system.com' },
    update: {},
    create: {
      fullName: 'System Developer',
      email: 'dev@nexus-system.com',
      passwordHash: devPasswordHash,
      jobTitle: 'System Architect',
      role: 'DEV',
      status: 'ACTIVE',
      employeeCode: 'SYS-ADMIN-001',
      organizationId: null,
    },
  });

  // 2. ORGANIZATION & BRANDING
  console.log('🏢 Synchronizing Initial Organization...');
  const org = await prisma.organization.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Nexus Main Organization',
      email: 'owner@nexus-main.com',
      subscriptionPlan: 'PRO',
      billingStatus: 'ACTIVE',
      primaryColor: '#6366f1',
      themePreset: 'nexus-dark',
    },
  });

  // 3. SYSTEM SETTINGS
  console.log('⚙️ Synchronizing System Settings...');
  const settings = await prisma.systemSettings.findFirst({
    where: { organizationId: org.id }
  });

  if (!settings) {
    await prisma.systemSettings.create({
      data: {
        organizationId: org.id,
        loginSubtitle: 'The future of Human Resource Management.',
        loginBullets: JSON.stringify([
          'Complete Employee Lifecycle Management',
          'Advanced KPI & Performance Tracking',
          'Global Payroll & Compliance',
          'Asset & Document Security',
        ]),
      },
    });
  }

  // 4. MD ACCOUNT
  console.log('👤 Synchronizing Managing Director (MD)...');
  await prisma.user.upsert({
    where: { email: 'md@nexus.com' },
    update: {},
    create: {
      fullName: 'Managing Director',
      email: 'md@nexus.com',
      passwordHash: mdPasswordHash,
      jobTitle: 'Managing Director',
      role: 'MD',
      employeeCode: 'EMP-001',
      organizationId: org.id,
    },
  });

  console.log('\n✅ SEED COMPLETE! System ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
