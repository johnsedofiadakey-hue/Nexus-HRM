import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing old data...');

  // Delete in strict FK-safe order
  await prisma.subscription.deleteMany();
  await prisma.appraisalRating.deleteMany();
  await prisma.appraisal.deleteMany();
  await prisma.competency.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.kpiItem.deleteMany();
  await prisma.kpiSheet.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.onboardingItem.deleteMany();
  await prisma.onboardingSession.deleteMany();
  await prisma.trainingEnrollment.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.publicHoliday.deleteMany();

  console.log('✓ Cleared. Creating departments...');

  // Departments
  const [execDept, salesDept, opsDept, itDept, hrDept] = await Promise.all([
    prisma.department.create({ data: { name: 'Executive' } }),
    prisma.department.create({ data: { name: 'Sales' } }),
    prisma.department.create({ data: { name: 'Operations' } }),
    prisma.department.create({ data: { name: 'IT' } }),
    prisma.department.create({ data: { name: 'Human Resources' } }),
  ]);

  console.log('✓ Departments. Creating users...');

  // Use cost 12 consistently everywhere
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // ── DEV MASTER (system owner — SUPER_ADMIN role) ─────────────────────
  await prisma.user.create({
    data: {
      fullName: 'Dev Master',
      email: 'dev@nexus-system.com',
      passwordHash: await hash('DevMaster@2025!'),
      jobTitle: 'System Developer',
      departmentId: itDept.id,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      employeeCode: 'DEV-001',
      leaveAllowance: 0,
      leaveBalance: 0,
      leaveAccruedAt: new Date(),
    },
  });

  // ── MD ───────────────────────────────────────────────────────────────
  const md = await prisma.user.create({
    data: {
      fullName: 'Richard Mensah',
      email: 'md@nexus.com',
      passwordHash: await hash('MD@Nexus2025!'),
      jobTitle: 'Managing Director',
      departmentId: execDept.id,
      role: 'MD',
      status: 'ACTIVE',
      employeeCode: 'EMP-001',
      salary: 25000,
      currency: 'GHS',
      leaveAllowance: 30,
      leaveBalance: 30,
      leaveAccruedAt: new Date(),
      gender: 'Male',
      contactNumber: '+233 24 000 0001',
      joinDate: new Date('2020-01-01'),
    },
  });

  // ── HR ADMIN ─────────────────────────────────────────────────────────
  const hrAdmin = await prisma.user.create({
    data: {
      fullName: 'Abena Asante',
      email: 'hr@nexus.com',
      passwordHash: await hash('HR@Nexus2025!'),
      jobTitle: 'HR Director',
      departmentId: hrDept.id,
      role: 'HR_ADMIN',
      status: 'ACTIVE',
      supervisorId: md.id,
      employeeCode: 'EMP-002',
      salary: 12000,
      currency: 'GHS',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
      gender: 'Female',
      contactNumber: '+233 24 000 0002',
      joinDate: new Date('2021-03-01'),
    },
  });

  // ── IT ADMIN ─────────────────────────────────────────────────────────
  const itAdmin = await prisma.user.create({
    data: {
      fullName: 'Kwame Boateng',
      email: 'it@nexus.com',
      passwordHash: await hash('IT@Nexus2025!'),
      jobTitle: 'IT Systems Administrator',
      departmentId: itDept.id,
      role: 'IT_ADMIN',
      status: 'ACTIVE',
      supervisorId: md.id,
      employeeCode: 'EMP-003',
      salary: 9500,
      currency: 'GHS',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
      gender: 'Male',
      contactNumber: '+233 24 000 0003',
      joinDate: new Date('2021-06-01'),
    },
  });

  // ── SUPERVISORS ───────────────────────────────────────────────────────
  const salesSup = await prisma.user.create({
    data: {
      fullName: 'Sarah Osei',
      email: 'sarah@nexus.com',
      passwordHash: await hash('Sarah@Nexus2025!'),
      jobTitle: 'Sales Manager',
      departmentId: salesDept.id,
      role: 'SUPERVISOR',
      status: 'ACTIVE',
      supervisorId: md.id,
      employeeCode: 'EMP-004',
      salary: 8500,
      currency: 'GHS',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
      gender: 'Female',
      contactNumber: '+233 24 000 0004',
      joinDate: new Date('2021-09-01'),
    },
  });

  const opsSup = await prisma.user.create({
    data: {
      fullName: 'Daniel Adjei',
      email: 'daniel@nexus.com',
      passwordHash: await hash('Daniel@Nexus2025!'),
      jobTitle: 'Operations Manager',
      departmentId: opsDept.id,
      role: 'SUPERVISOR',
      status: 'ACTIVE',
      supervisorId: md.id,
      employeeCode: 'EMP-005',
      salary: 8000,
      currency: 'GHS',
      leaveAllowance: 24,
      leaveBalance: 24,
      leaveAccruedAt: new Date(),
      gender: 'Male',
      contactNumber: '+233 24 000 0005',
      joinDate: new Date('2022-01-15'),
    },
  });

  // ── EMPLOYEES ─────────────────────────────────────────────────────────
  const akosua = await prisma.user.create({
    data: {
      fullName: 'Akosua Darko',
      email: 'akosua@nexus.com',
      passwordHash: await hash('Akosua@Nexus2025!'),
      jobTitle: 'Sales Associate',
      departmentId: salesDept.id,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      supervisorId: salesSup.id,
      employeeCode: 'EMP-006',
      salary: 4500,
      currency: 'GHS',
      leaveAllowance: 21,
      leaveBalance: 21,
      leaveAccruedAt: new Date(),
      gender: 'Female',
      contactNumber: '+233 24 000 0006',
      joinDate: new Date('2022-04-01'),
    },
  });

  await prisma.user.create({
    data: {
      fullName: 'Kofi Mensah',
      email: 'kofi@nexus.com',
      passwordHash: await hash('Kofi@Nexus2025!'),
      jobTitle: 'Sales Representative',
      departmentId: salesDept.id,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      supervisorId: salesSup.id,
      employeeCode: 'EMP-007',
      salary: 4200,
      currency: 'GHS',
      leaveAllowance: 21,
      leaveBalance: 21,
      leaveAccruedAt: new Date(),
      gender: 'Male',
      contactNumber: '+233 24 000 0007',
      joinDate: new Date('2022-07-01'),
    },
  });

  await prisma.user.create({
    data: {
      fullName: 'Ama Owusu',
      email: 'ama@nexus.com',
      passwordHash: await hash('Ama@Nexus2025!'),
      jobTitle: 'Operations Analyst',
      departmentId: opsDept.id,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      supervisorId: opsSup.id,
      employeeCode: 'EMP-008',
      salary: 4800,
      currency: 'GHS',
      leaveAllowance: 21,
      leaveBalance: 21,
      leaveAccruedAt: new Date(),
      gender: 'Female',
      contactNumber: '+233 24 000 0008',
      joinDate: new Date('2023-01-10'),
    },
  });

  console.log('✓ Users. Creating appraisal cycle...');

  // ── APPRAISAL CYCLE ───────────────────────────────────────────────────
  const cycle = await prisma.cycle.create({
    data: {
      name: 'Q4 2025 Performance Review',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-12-31'),
      type: 'QUARTERLY',
      status: 'ACTIVE',
    },
  });

  await Promise.all([
    prisma.competency.create({ data: { name: 'Communication', description: 'Clarity and effectiveness', weight: 25 } }),
    prisma.competency.create({ data: { name: 'Teamwork', description: 'Collaboration and team contribution', weight: 25 } }),
    prisma.competency.create({ data: { name: 'Technical Skills', description: 'Job-specific technical competency', weight: 30 } }),
    prisma.competency.create({ data: { name: 'Leadership', description: 'Initiative and influence', weight: 20 } }),
  ]);

  console.log('✓ Cycle. Creating KPI sheets...');

  // ── KPI: MD assigns targets to Sarah (Supervisor) ─────────────────────
  await prisma.kpiSheet.create({
    data: {
      title: 'Q4 2025 KPI — Sarah Osei (Sales Manager)',
      month: 12,
      year: 2025,
      employeeId: salesSup.id,
      reviewerId: md.id,
      status: 'ACTIVE',
      items: {
        create: [
          { name: 'Team Revenue Target', category: 'Sales', description: 'Achieve team monthly revenue', weight: 40, targetValue: 500000, actualValue: 0, score: 0 },
          { name: 'Team KPI Completion Rate', category: 'Management', description: 'Ensure all team KPIs are submitted', weight: 30, targetValue: 100, actualValue: 0, score: 0 },
          { name: 'New Client Acquisition', category: 'Sales', description: 'Number of new clients onboarded', weight: 30, targetValue: 10, actualValue: 0, score: 0 },
        ],
      },
    },
  });

  // ── KPI: Sarah assigns targets to Akosua (Employee) ──────────────────
  await prisma.kpiSheet.create({
    data: {
      title: 'Q4 2025 KPI — Akosua Darko (Sales Associate)',
      month: 12,
      year: 2025,
      employeeId: akosua.id,
      reviewerId: salesSup.id,
      status: 'ACTIVE',
      items: {
        create: [
          { name: 'Monthly Sales Revenue', category: 'Sales', description: 'Personal monthly revenue target', weight: 50, targetValue: 80000, actualValue: 0, score: 0 },
          { name: 'Customer Follow-ups', category: 'Customer Service', description: 'Follow up with existing clients', weight: 30, targetValue: 40, actualValue: 0, score: 0 },
          { name: 'Product Knowledge Training', category: 'Learning', description: 'Complete product training module', weight: 20, targetValue: 1, actualValue: 0, score: 0 },
        ],
      },
    },
  });

  console.log('✓ KPI sheets. Creating holidays...');

  // ── PUBLIC HOLIDAYS ────────────────────────────────────────────────────
  const ghHolidays = [
    { name: "New Year's Day", date: new Date('2025-01-01') },
    { name: 'Constitution Day', date: new Date('2025-01-07') },
    { name: 'Independence Day', date: new Date('2025-03-06') },
    { name: 'Good Friday', date: new Date('2025-04-18') },
    { name: 'Easter Monday', date: new Date('2025-04-21') },
    { name: "Workers' Day", date: new Date('2025-05-01') },
    { name: 'Africa Day', date: new Date('2025-05-25') },
    { name: "Founder's Day", date: new Date('2025-08-04') },
    { name: 'Kwame Nkrumah Memorial Day', date: new Date('2025-09-21') },
    { name: "Farmer's Day", date: new Date('2025-12-05') },
    { name: 'Christmas Day', date: new Date('2025-12-25') },
    { name: 'Boxing Day', date: new Date('2025-12-26') },
  ];
  for (const h of ghHolidays) {
    await prisma.publicHoliday.create({ data: { ...h, country: 'GH', year: 2025 } });
  }

  console.log('✓ Holidays. Creating system settings...');

  // ── SYSTEM SETTINGS ────────────────────────────────────────────────────
  // SystemSettings id is a uuid String — do NOT pass hardcoded int
  await prisma.systemSettings.create({
    data: {
      companyName: 'Nexus HRM',
      companyLogoUrl: '',
      primaryColor: '#6366f1',
      secondaryColor: '#1e293b',
      accentColor: '#06b6d4',
      plan: 'PRO',
      monthlyPriceGHS: 299,
      annualPriceGHS: 2990,
      trialDays: 14,
      lightMode: false,
      // Login page customisation
      loginNotice: '',
      loginSubtitle: 'People Operations, Reimagined.',
      loginBullets: JSON.stringify([
        'Full performance & KPI management',
        'Automated leave & approval workflows',
        'Real-time compliance & audit trails',
        'Multi-role access with full visibility control',
      ]),
    },
  });

  console.log('\n✅ SEED COMPLETE!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑  SIMULATION CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('👑  DEV MASTER');
  console.log('    Email  : dev@nexus-system.com');
  console.log('    Pass   : DevMaster@2025!');
  console.log('    Portal : /nexus-dev-portal');
  console.log('    DevKey : NEXUS-DEV-MASTER-2025-SECURE');
  console.log('');
  console.log('🏢  MANAGING DIRECTOR');
  console.log('    Email  : md@nexus.com');
  console.log('    Pass   : MD@Nexus2025!');
  console.log('');
  console.log('👤  HR ADMIN');
  console.log('    Email  : hr@nexus.com');
  console.log('    Pass   : HR@Nexus2025!');
  console.log('');
  console.log('💻  IT ADMIN');
  console.log('    Email  : it@nexus.com');
  console.log('    Pass   : IT@Nexus2025!');
  console.log('');
  console.log('👔  SALES SUPERVISOR');
  console.log('    Email  : sarah@nexus.com');
  console.log('    Pass   : Sarah@Nexus2025!');
  console.log('');
  console.log('👔  OPS SUPERVISOR');
  console.log('    Email  : daniel@nexus.com');
  console.log('    Pass   : Daniel@Nexus2025!');
  console.log('');
  console.log('👤  EMPLOYEE (Sales)');
  console.log('    Email  : akosua@nexus.com');
  console.log('    Pass   : Akosua@Nexus2025!');
  console.log('');
  console.log('👤  EMPLOYEE (Sales)');
  console.log('    Email  : kofi@nexus.com');
  console.log('    Pass   : Kofi@Nexus2025!');
  console.log('');
  console.log('👤  EMPLOYEE (Ops)');
  console.log('    Email  : ama@nexus.com');
  console.log('    Pass   : Ama@Nexus2025!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠   DEV KEY goes in .env as: DEV_MASTER_KEY=NEXUS-DEV-MASTER-2025-SECURE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
