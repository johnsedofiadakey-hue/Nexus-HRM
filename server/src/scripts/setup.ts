/**
 * Nexus HRM — First-time Setup Script
 * Run this ONCE after deploying to production:
 *   npx ts-node src/scripts/setup.ts
 * Or via npm:
 *   npm run setup
 *
 * Creates the default organization and all role accounts.
 * Safe to run multiple times — uses upsert everywhere.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const DEFAULT_ACCOUNTS = [
  { email: 'dev@nexus-system.com',  password: 'DevMaster@2025!',      role: 'DEV',         fullName: 'System Developer',   jobTitle: 'System Developer' },
  { email: 'md@nexus.com',          password: 'MD@Nexus2025!',         role: 'MD',          fullName: 'Managing Director',  jobTitle: 'Managing Director' },
  { email: 'director@nexus.com',    password: 'Director@Nexus2025!',   role: 'DIRECTOR',    fullName: 'Operations Director',jobTitle: 'Director of Operations' },
  { email: 'manager@nexus.com',     password: 'Manager@Nexus2025!',    role: 'MANAGER',     fullName: 'Department Manager', jobTitle: 'Department Manager' },
  { email: 'mid@nexus.com',         password: 'Mid@Nexus2025!',        role: 'MID_MANAGER', fullName: 'Team Lead',          jobTitle: 'Team Lead' },
  { email: 'staff@nexus.com',       password: 'Staff@Nexus2025!',      role: 'STAFF',       fullName: 'Staff Member',       jobTitle: 'Senior Staff' },
  { email: 'casual@nexus.com',      password: 'Casual@Nexus2025!',     role: 'CASUAL',      fullName: 'Casual Worker',      jobTitle: 'Casual Employee' },
];

async function setup() {
  console.log('\n🚀 Nexus HRM — Production Setup\n');

  // ── 1. Default Organization ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Nexus HRM Default',
      email: 'admin@nexus.com',
      currency: 'GNF',
      subscriptionPlan: 'PRO',
      billingStatus: 'ACTIVE',
      primaryColor: '#4F46E5',
      trialStartDate: new Date(),
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ── 2. System Settings ───────────────────────────────────────────────────
  await prisma.systemSettings.upsert({
    where: { organizationId: 'default-tenant' },
    update: {},
    create: {
      organizationId: 'default-tenant',
      isMaintenanceMode: false,
      securityLockdown: false,
      trialDays: 30,
    },
  });
  console.log('✅ System settings initialised');

  // ── 3. User Accounts ─────────────────────────────────────────────────────
  console.log('\n👥 Creating accounts...');
  const createdUsers: any[] = [];

  for (const acc of DEFAULT_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acc.password, SALT_ROUNDS);
    const orgId = acc.role === 'DEV' ? null : 'default-tenant';

    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: {
        email: acc.email,
        passwordHash,
        fullName: acc.fullName,
        role: acc.role,
        jobTitle: acc.jobTitle,
        status: 'ACTIVE',
        leaveBalance: 24,
        leaveAllowance: 24,
        organizationId: orgId,
        joinDate: new Date(),
      },
    });

    createdUsers.push(user);
    console.log(`  ✅ ${acc.role.padEnd(12)} ${acc.email} (${acc.password})`);
  }

  // ── 4. Set up reporting hierarchy ────────────────────────────────────────
  const md       = createdUsers.find(u => u.role === 'MD');
  const director = createdUsers.find(u => u.role === 'DIRECTOR');
  const manager  = createdUsers.find(u => u.role === 'MANAGER');
  const midMgr   = createdUsers.find(u => u.role === 'MID_MANAGER');
  const staff    = createdUsers.find(u => u.role === 'STAFF');
  const casual   = createdUsers.find(u => u.role === 'CASUAL');

  if (md && director) await prisma.user.update({ where: { id: director.id }, data: { supervisorId: md.id } });
  if (director && manager) await prisma.user.update({ where: { id: manager.id }, data: { supervisorId: director.id } });
  if (manager && midMgr) await prisma.user.update({ where: { id: midMgr.id }, data: { supervisorId: manager.id } });
  if (midMgr && staff) await prisma.user.update({ where: { id: staff.id }, data: { supervisorId: midMgr.id } });
  if (midMgr && casual) await prisma.user.update({ where: { id: casual.id }, data: { supervisorId: midMgr.id } });
  console.log('\n✅ Reporting hierarchy configured');

  // ── 5. Departments ───────────────────────────────────────────────────────
  const depts = [
    { name: 'Human Resources',   managerId: director?.id },
    { name: 'Technology',        managerId: manager?.id },
    { name: 'Finance',           managerId: director?.id },
    { name: 'Operations',        managerId: manager?.id },
    { name: 'Sales & Marketing', managerId: manager?.id },
  ];

  let firstDeptId: number | null = null;
  for (const dept of depts) {
    const d = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name, organizationId: 'default-tenant', managerId: dept.managerId },
    });
    if (!firstDeptId) firstDeptId = d.id;
  }
  console.log(`✅ ${depts.length} departments created`);

  // ── 6. Assign staff to first department ──────────────────────────────────
  if (firstDeptId && staff) {
    await prisma.user.update({ where: { id: staff.id }, data: { departmentId: firstDeptId } });
  }
  if (firstDeptId && casual) {
    await prisma.user.update({ where: { id: casual.id }, data: { departmentId: firstDeptId } });
  }

  // ── 7. Sample Guinea Public Holidays 2026 ─────────────────────────────────
  const holidays2026 = [
    { name: "New Year's Day",          date: new Date('2026-01-01') },
    { name: "Easter Monday",           date: new Date('2026-04-06') },
    { name: "Eid al-Fitr",            date: new Date('2026-03-31') }, // Approx
    { name: "Labour Day",              date: new Date('2026-05-01') },
    { name: "Eid al-Adha",            date: new Date('2026-06-07') }, // Approx
    { name: "Assumption Day",          date: new Date('2026-08-15') },
    { name: "Independence Day",        date: new Date('2026-10-02') },
    { name: "Maulid al-Nabi",          date: new Date('2026-09-05') }, // Approx
    { name: "All Saints' Day",         date: new Date('2026-11-01') },
    { name: "Christmas Day",           date: new Date('2026-12-25') },
  ];

  for (const h of holidays2026) {
    const holidayId = `gn-2026-${h.date.getMonth() + 1}-${h.date.getDate()}`;
    await (prisma as any).publicHoliday.upsert({
      where: { id: holidayId },
      update: {},
      create: {
        id: holidayId,
        organizationId: 'default-tenant',
        name: h.name,
        date: h.date,
        country: 'GN',
        year: 2026,
        isRecurring: false,
      },
    }).catch(() => {
      // ignore duplicate if already exists
    });
  }
  console.log('✅ Guinea national holidays 2026 seeded');

  // ── 8. Sample Target for demonstration ───────────────────────────────────
  if (md && staff) {
    await prisma.target.upsert({
      where: { id: 'demo-target-001' },
      update: {},
      create: {
        id: 'demo-target-001',
        organizationId: 'default-tenant',
        title: 'Q2 2026 Performance Goal — Sample',
        description: 'Demonstrate how individual targets work. Update your progress and submit for review.',
        level: 'INDIVIDUAL',
        type: 'SINGLE',
        status: 'ASSIGNED',
        dueDate: new Date('2026-06-30'),
        assigneeId: staff.id,
        originatorId: md.id,
        lineManagerId: midMgr?.id || md.id,
        reviewerId: manager?.id || md.id,
        weight: 1.0,
        metrics: {
          create: [
            { organizationId: 'default-tenant', title: 'Tasks Completed', metricType: 'NUMERICAL', targetValue: 50, unit: 'tasks', weight: 0.5 },
            { organizationId: 'default-tenant', title: 'Customer Satisfaction', metricType: 'PERCENTAGE', targetValue: 90, unit: '%', weight: 0.5 },
          ],
        },
      },
    }).catch(() => {});
  }
  console.log('✅ Sample target created');

  console.log('\n🎉 Setup complete! You can now log in with any of the accounts above.');
  console.log('   Change passwords immediately after first login.\n');
}

setup()
  .catch(e => { console.error('❌ Setup failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
