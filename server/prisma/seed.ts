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
      name: 'MC Bauchemie Personnel',
      email: 'owner@mcbauchemie.com',
      subscriptionPlan: 'PRO',
      billingStatus: 'ACTIVE',
      primaryColor: '#6366f1',
      themePreset: 'premium-monolith',
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
        loginSubtitle: 'Powered by MC Bauchemie Personnel Operations Center.',
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

  // 5. OFFBOARDING TEMPLATES (Staff Leaving)
  console.log('📋 Synchronizing Offboarding Templates (Staff Leaving)...');
  const templates = [
    {
      name: 'Standard Employee Exit',
      description: 'Standard clearance process for administrative and general staff.',
      tasks: [
        { title: 'Revoke Email & VPN Access', category: 'IT', order: 1 },
        { title: 'Return Laptop & Official Equipment', category: 'IT', order: 2 },
        { title: 'Handover Portfolio & Files', category: 'Work', order: 3 },
        { title: 'Submit Final Expense Claims', category: 'Finance', order: 4 },
        { title: 'Finance Clearance (Loans/Owed)', category: 'Finance', order: 5 },
        { title: 'Exit Interview', category: 'HR', order: 6 },
        { title: 'Revoke Physical Access/ID Cards', category: 'Security', order: 7 },
      ]
    },
    {
      name: 'Managerial Exit Protocol',
      description: 'Advanced clearance for leadership and management positions.',
      tasks: [
        { title: 'Team Handover Meeting', category: 'Leadership', order: 1 },
        { title: 'Revoke Admin/Manager Access Groups', category: 'IT', order: 2 },
        { title: 'Return Company Vehicle (if applicable)', category: 'Logistics', order: 3 },
        { title: 'Final Performance Appraisals for Direct Reports', category: 'HR', order: 4 },
        { title: 'Handover Budgetary/Signatory Authority', category: 'Finance', order: 5 },
        { title: 'In-Depth Exit Review', category: 'HR', order: 6 },
      ]
    }
  ];

  for (const t of templates) {
    let template = await prisma.offboardingTemplate.findFirst({
      where: { organizationId: org.id, name: t.name }
    });

    if (!template) {
      template = await prisma.offboardingTemplate.create({
        data: {
          organizationId: org.id,
          name: t.name,
          description: t.description,
        }
      });
    }

    for (const task of t.tasks) {
      const existingTask = await prisma.offboardingTask.findFirst({
        where: { templateId: template.id, title: task.title }
      });

      if (!existingTask) {
        await prisma.offboardingTask.create({
          data: {
            organizationId: org.id,
            templateId: template.id,
            title: task.title,
            category: task.category,
            order: task.order,
          }
        });
      }
    }
  }

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
