import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing old data...');

  // Delete in strict FK-safe order
  // Must clear in FK-dependency order
  await prisma.saasSubscription.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.loginSecurityEvent.deleteMany();
  await prisma.backupLog.deleteMany();
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
  await prisma.leaveRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.asset.deleteMany();
  // Extended cleanup - all models with FK dependencies
  await prisma.announcement.deleteMany();
  await prisma.employeeBenefitEnrollment.deleteMany();
  await prisma.benefitPlan.deleteMany();
  await prisma.compensationHistory.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.employeeDocument.deleteMany();
  await prisma.employeeQuery.deleteMany();
  await prisma.employeeHistory.deleteMany();
  await prisma.expenseClaim.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.offboardingProcess.deleteMany();
  await prisma.onboardingChecklistTask.deleteMany();
  await prisma.onboardingChecklist.deleteMany();
  await prisma.onboardingTemplate.deleteMany();
  await prisma.performanceScore.deleteMany();
  await prisma.performanceReviewV2.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.employeeShift.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.taxBracket.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.employeeTarget.deleteMany();
  await prisma.teamTarget.deleteMany();
  await prisma.departmentKPI.deleteMany();
  await prisma.interviewFeedback.deleteMany();
  await prisma.interviewStage.deleteMany();
  await prisma.offerLetter.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobPosition.deleteMany();
  await prisma.trainingEnrollment.deleteMany();
  await prisma.trainingProgram.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.publicHoliday.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✓ Cleared. Creating default organization...');

  // Default Organization
  const org = await prisma.organization.create({
    data: {
      id: 'default-tenant',
      name: 'Nexus HRM Default',
      email: 'admin@nexus.com',
      subscriptionPlan: 'PRO',
      subscriptionAmount: 299,
      billingStatus: 'ACTIVE',
    },
  });

  console.log('✓ Organization. Creating departments...');

  // Departments
  const [execDept, salesDept, opsDept, itDept, hrDept] = await Promise.all([
    prisma.department.create({ data: { name: 'Executive', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Sales', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Operations', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'IT', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Human Resources', organizationId: org.id } }),
  ]);

  console.log('✓ Departments. Creating users...');

  // Use cost 12 consistently everywhere
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // ── DEV MASTER (100) ────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      fullName: 'Dev Master',
      email: 'dev@nexus-system.com',
      passwordHash: await hash('DevMaster@2025!'),
      jobTitle: 'System Developer',
      departmentId: itDept.id,
      role: 'DEV',
      status: 'ACTIVE',
      employeeCode: 'DEV-001',
      organizationId: org.id,
    },
  });

  // ── MD (90) ────────────────────────────────────────────────────────
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
      organizationId: org.id,
    },
  });

  // ── DIRECTOR (80) ──────────────────────────────────────────────────
  const director = await prisma.user.create({
    data: {
      fullName: 'Abena Asante',
      email: 'director@nexus.com',
      passwordHash: await hash('Director@Nexus2025!'),
      jobTitle: 'HR Director',
      departmentId: hrDept.id,
      role: 'DIRECTOR',
      status: 'ACTIVE',
      supervisorId: md.id,
      employeeCode: 'EMP-002',
      organizationId: org.id,
    },
  });

  // ── MANAGER (70) ───────────────────────────────────────────────────
  const manager = await prisma.user.create({
    data: {
      fullName: 'Sarah Osei',
      email: 'manager@nexus.com',
      passwordHash: await hash('Manager@Nexus2025!'),
      jobTitle: 'Sales Manager',
      departmentId: salesDept.id,
      role: 'MANAGER',
      status: 'ACTIVE',
      supervisorId: director.id,
      employeeCode: 'EMP-003',
      organizationId: org.id,
    },
  });

  // ── MID_MANAGER (60) ───────────────────────────────────────────────
  const midManager = await prisma.user.create({
    data: {
      fullName: 'Daniel Adjei',
      email: 'mid@nexus.com',
      passwordHash: await hash('Mid@Nexus2025!'),
      jobTitle: 'Ops Team Lead',
      departmentId: opsDept.id,
      role: 'MID_MANAGER',
      status: 'ACTIVE',
      supervisorId: manager.id,
      employeeCode: 'EMP-004',
      organizationId: org.id,
    },
  });

  // ── STAFF (50) ─────────────────────────────────────────────────────
  const staff = await prisma.user.create({
    data: {
      fullName: 'Akosua Darko',
      email: 'staff@nexus.com',
      passwordHash: await hash('Staff@Nexus2025!'),
      jobTitle: 'Sales Associate',
      departmentId: salesDept.id,
      role: 'STAFF',
      status: 'ACTIVE',
      supervisorId: midManager.id,
      employeeCode: 'EMP-005',
      organizationId: org.id,
    },
  });

  // ── CASUAL (40) ────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      fullName: 'Kofi Mensah',
      email: 'casual@nexus.com',
      passwordHash: await hash('Casual@Nexus2025!'),
      jobTitle: 'Casual Worker',
      departmentId: opsDept.id,
      role: 'CASUAL',
      status: 'ACTIVE',
      supervisorId: staff.id,
      employeeCode: 'EMP-006',
      organizationId: org.id,
    },
  });

  console.log('✓ Users. Creating appraisal cycle...');

  // ── APPRAISAL CYCLE ───────────────────────────────────────────────────
  await prisma.cycle.create({
    data: {
      name: 'Q4 2025 Performance Review',
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-12-31'),
      type: 'QUARTERLY',
      status: 'ACTIVE',
      organizationId: org.id,
    },
  });

  await Promise.all([
    prisma.competency.create({ data: { name: 'Communication', description: 'Clarity and effectiveness', weight: 25, organizationId: org.id } }),
    prisma.competency.create({ data: { name: 'Teamwork', description: 'Collaboration and team contribution', weight: 25, organizationId: org.id } }),
    prisma.competency.create({ data: { name: 'Technical Skills', description: 'Job-specific technical competency', weight: 30, organizationId: org.id } }),
    prisma.competency.create({ data: { name: 'Leadership', description: 'Initiative and influence', weight: 20, organizationId: org.id } }),
  ]);

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
    await prisma.publicHoliday.create({ data: { ...h, country: 'GH', year: 2025, organizationId: org.id } });
  }

  console.log('✓ Holidays. Creating system settings...');

  // ── SYSTEM SETTINGS ────────────────────────────────────────────────────
  await prisma.systemSettings.create({
    data: {
      organizationId: org.id,
      monthlyPriceGHS: 299,
      annualPriceGHS: 2990,
      trialDays: 14,
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
  console.log('👑  DEV (100)      : dev@nexus-system.com / DevMaster@2025!');
  console.log('🏢  MD (90)       : md@nexus.com / MD@Nexus2025!');
  console.log('👤  DIRECTOR (80) : director@nexus.com / Director@Nexus2025!');
  console.log('👔  MANAGER (70)  : manager@nexus.com / Manager@Nexus2025!');
  console.log('👔  MID_MGR (60)  : mid@nexus.com / Mid@Nexus2025!');
  console.log('👤  STAFF (50)    : staff@nexus.com / Staff@Nexus2025!');
  console.log('👤  CASUAL (40)   : casual@nexus.com / Casual@Nexus2025!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
