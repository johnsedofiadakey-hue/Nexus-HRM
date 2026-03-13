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

  // --- SYSTEM ADMIN (DEV MASTER - 100) ---
  // Strictly autonomous, full system control, no organization affiliation.
  console.log('👤 Creating System Developer (DEV)...');
  await prisma.user.create({
    data: {
      fullName: 'System Developer',
      email: 'dev@nexus-system.com',
      passwordHash: await hash('DevMaster@2025!'),
      jobTitle: 'System Architect',
      role: 'DEV',
      status: 'ACTIVE',
      employeeCode: 'SYS-ADMIN-001',
      organizationId: null, // Explicitly null to override default "default-tenant"
    },
  });


  // --- ORGANIZATION & BRANDING ---
  console.log('🏢 Creating Initial Organization...');
  const org = await prisma.organization.create({
    data: {
      id: 'default-tenant',
      name: 'Nexus Main Organization',
      email: 'owner@nexus-main.com',
      subscriptionPlan: 'PRO',
      billingStatus: 'ACTIVE',
      primaryColor: '#6366f1',
      themePreset: 'nexus-dark',
    },
  });

  // Initial settings for the organization
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

  // --- MD ACCOUNT ---
  // The organization owner who builds the rest of the company.
  console.log('👤 Creating Managing Director (MD)...');
  await prisma.user.create({
    data: {
      fullName: 'Managing Director',
      email: 'md@nexus.com',
      passwordHash: await hash('Rich@2025'),
      jobTitle: 'Managing Director',
      role: 'MD',
      employeeCode: 'EMP-001',
      organizationId: org.id,
    },
  });

  console.log('\n✅ RESET COMPLETE! System initialized with DEV and MD accounts only.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
