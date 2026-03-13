import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing old data in strict FK order...');

  // Must clear in reverse dependency order
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
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.employeeBenefitEnrollment.deleteMany();
  await prisma.benefitPlan.deleteMany();
  await prisma.compensationHistory.deleteMany();
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

  console.log('✓ Database cleared.');

  // --- PROXIES & HELPERS ---
  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const now = new Date();

  // --- ORGANIZATION & BRANDING ---
  console.log('🏢 Creating Organization & Branding...');
  const org = await prisma.organization.create({
    data: {
      id: 'default-tenant',
      name: 'Nexus Global Solutions',
      email: 'corp@nexus-global.com',
      phone: '+233 24 123 4567',
      address: '15 High Street, Accra',
      country: 'Ghana',
      currency: 'GHS',
      subscriptionPlan: 'PRO',
      subscriptionAmount: 499,
      billingStatus: 'ACTIVE',
      primaryColor: '#6366f1',
      secondaryColor: '#1e293b',
      accentColor: '#f59e0b',
      themePreset: 'nexus-dark',
      logoUrl: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=200&auto=format&fit=crop', // Elegant abstract logo
    },
  });

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
      monthlyPriceGHS: 499,
      annualPriceGHS: 4990,
      trialDays: 30,
    },
  });

  // --- DEPARTMENTS ---
  console.log('📂 Creating Departments...');
  const depts = await Promise.all([
    prisma.department.create({ data: { name: 'Executive', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Human Resources', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Information Technology', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Finance & Accounting', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Sales & Marketing', organizationId: org.id } }),
    prisma.department.create({ data: { name: 'Operations', organizationId: org.id } }),
  ]);
  const [execD, hrD, itD, finD, salesD, opsD] = depts;

  // --- USERS HIERARCHY ---
  console.log('👤 Creating Users (Directors, Managers, Staff)...');

  // MD (Richard)
  const md = await prisma.user.create({
    data: {
      fullName: 'Richard Mensah',
      email: 'md@nexus.com',
      passwordHash: await hash('Rich@2025'),
      jobTitle: 'Managing Director',
      role: 'MD',
      departmentId: execD.id,
      employeeCode: 'EMP-001',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop',
    },
  });

  // Directors
  const dirHR = await prisma.user.create({
    data: {
      fullName: 'Anita Thompson',
      email: 'hr.dir@nexus.com',
      passwordHash: await hash('Anita@2025'),
      jobTitle: 'HR Director',
      role: 'DIRECTOR',
      departmentId: hrD.id,
      supervisorId: md.id,
      employeeCode: 'EMP-002',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
    },
  });

  const dirFin = await prisma.user.create({
    data: {
      fullName: 'Samuel Boateng',
      email: 'fin.dir@nexus.com',
      passwordHash: await hash('Sam@2025'),
      jobTitle: 'Finance Director',
      role: 'DIRECTOR',
      departmentId: finD.id,
      supervisorId: md.id,
      employeeCode: 'EMP-003',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop',
    },
  });

  // Managers
  const mgrIT = await prisma.user.create({
    data: {
      fullName: 'David Kwesi',
      email: 'it.mgr@nexus.com',
      passwordHash: await hash('David@2025'),
      jobTitle: 'IT Manager',
      role: 'MANAGER',
      departmentId: itD.id,
      supervisorId: dirFin.id, // Report to Finance in this org
      employeeCode: 'EMP-004',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    },
  });

  const mgrSales = await prisma.user.create({
    data: {
      fullName: 'Jennifer Ohene',
      email: 'sales.mgr@nexus.com',
      passwordHash: await hash('Jen@2025'),
      jobTitle: 'Sales Manager',
      role: 'MANAGER',
      departmentId: salesD.id,
      supervisorId: dirHR.id,
      employeeCode: 'EMP-005',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop',
    },
  });

  // Staff
  const staffIT1 = await prisma.user.create({
    data: {
      fullName: 'Isaac Newton',
      email: 'isaac@nexus.com',
      passwordHash: await hash('Isaac@2025'),
      jobTitle: 'Sr. Backend Engineer',
      role: 'STAFF',
      departmentId: itD.id,
      supervisorId: mgrIT.id,
      employeeCode: 'EMP-006',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    },
  });

  const staffSales1 = await prisma.user.create({
    data: {
      fullName: 'Blessing Adjei',
      email: 'blessing@nexus.com',
      passwordHash: await hash('Blessing@2025'),
      jobTitle: 'Sales Representative',
      role: 'STAFF',
      departmentId: salesD.id,
      supervisorId: mgrSales.id,
      employeeCode: 'EMP-007',
      organizationId: org.id,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    },
  });

  // Dev Master
  await prisma.user.create({
    data: {
      fullName: 'Dev Master',
      email: 'dev@nexus-system.com',
      passwordHash: await hash('DevMaster@2025!'),
      jobTitle: 'System Architect',
      role: 'DEV',
      departmentId: itD.id,
      employeeCode: 'DEV-001',
      organizationId: org.id,
    },
  });

  // Update Departments with Managers
  await prisma.department.update({ where: { id: execD.id }, data: { managerId: md.id } });
  await prisma.department.update({ where: { id: hrD.id }, data: { managerId: dirHR.id } });
  await prisma.department.update({ where: { id: itD.id }, data: { managerId: mgrIT.id } });
  await prisma.department.update({ where: { id: finD.id }, data: { managerId: dirFin.id } });
  await prisma.department.update({ where: { id: salesD.id }, data: { managerId: mgrSales.id } });

  // --- ASSETS ---
  console.log('💻 Creating Assets & Assignments...');
  const asset1 = await prisma.asset.create({
    data: {
      name: 'MacBook Pro M3 Max',
      serialNumber: 'MBP-2025-001',
      type: 'LAPTOP',
      status: 'ASSIGNED',
      description: 'High performance laptop for Dev',
      organizationId: org.id,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      name: 'Dell Latitude 7440',
      serialNumber: 'DELL-2025-002',
      type: 'LAPTOP',
      status: 'ASSIGNED',
      description: 'Business laptop for Sales',
      organizationId: org.id,
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      name: 'Toyota Land Cruiser',
      serialNumber: 'VEH-001-GH',
      type: 'VEHICLE',
      status: 'ASSIGNED',
      description: 'Company vehicle for MD',
      organizationId: org.id,
    },
  });

  await prisma.asset.create({
    data: {
      name: 'Office Chair - Ergonomic',
      serialNumber: 'FUR-001',
      type: 'FURNITURE',
      status: 'AVAILABLE',
      organizationId: org.id,
    },
  });

  // Assignments
  await prisma.assetAssignment.create({
    data: { assetId: asset1.id, userId: staffIT1.id, organizationId: org.id, conditionOnAssign: 'New' },
  });
  await prisma.assetAssignment.create({
    data: { assetId: asset2.id, userId: staffSales1.id, organizationId: org.id, conditionOnAssign: 'New' },
  });
  await prisma.assetAssignment.create({
    data: { assetId: asset3.id, userId: md.id, organizationId: org.id, conditionOnAssign: 'Mint' },
  });

  // --- ANNOUNCEMENTS ---
  console.log('📢 Creating Announcements...');
  await prisma.announcement.create({
    data: {
      title: 'Welcome to Nexus Global',
      content: 'We are excited to launch our new HRM system. Please explore your dashboard and update your profile.',
      createdById: md.id,
      targetAudience: 'ALL',
      priority: 'HIGH',
      organizationId: org.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'New Health Insurance Policy',
      content: 'All staff members are required to sign up for the new health insurance plan by the end of this month.',
      createdById: dirHR.id,
      targetAudience: 'ALL',
      priority: 'URGENT',
      organizationId: org.id,
    },
  });

  // --- LEAVE REQUESTS ---
  console.log('📅 Creating Leave Requests...');
  await prisma.leaveRequest.create({
    data: {
      employeeId: staffIT1.id,
      startDate: new Date('2025-04-10'),
      endDate: new Date('2025-04-15'),
      leaveDays: 5,
      reason: 'Annual Vacation',
      status: 'APPROVED',
      organizationId: org.id,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: staffSales1.id,
      startDate: new Date('2025-05-01'),
      endDate: new Date('2025-05-03'),
      leaveDays: 2,
      reason: 'Urgent Family Matter',
      status: 'PENDING_MANAGER',
      organizationId: org.id,
    },
  });

  // --- APPRAISAL CYCLE & KPIs ---
  console.log('📈 Creating Appraisal Data...');
  const cycle = await prisma.cycle.create({
    data: {
      name: 'FY 2025 Performance Cycle',
      type: 'ANNUAL',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      organizationId: org.id,
    },
  });

  await prisma.kpiSheet.create({
    data: {
      employeeId: staffIT1.id,
      month: 3,
      year: 2025,
      title: 'IT Performance March',
      organizationId: org.id,
      totalScore: 85,
      status: 'COMPLETED',
      items: {
        create: [
          { name: 'System Uptime', targetValue: 99.9, actualValue: 99.95, weight: 0.5, category: 'Technical' },
          { name: 'Ticket Resolution', targetValue: 50, actualValue: 48, weight: 0.5, category: 'Service' },
        ],
      },
    },
  });

  // --- NOTIFICATIONS ---
  await prisma.notification.create({
    data: {
      userId: md.id,
      title: 'New Subscription Active',
      message: 'Nexus Global Solutions is now on the PRO plan.',
      type: 'SUCCESS',
      organizationId: org.id,
    },
  });

  console.log('\n✅ SEEDING COMPLETE! You are production-ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
