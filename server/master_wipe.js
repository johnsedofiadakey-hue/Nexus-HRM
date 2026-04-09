require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function masterWipe() {
  console.log('--- NUKING APPRAISAL DOMAIN ---');
  try {
    const result = await prisma.$transaction(async (tx) => {
      const r1 = await tx.appraisalReview.deleteMany();
      const r2 = await tx.appraisalPacket.deleteMany();
      const r3 = await tx.appraisalCycle.deleteMany();
      const r4 = await tx.performanceScore.deleteMany();
      const r5 = await tx.performanceReviewV2.deleteMany();
      const r6 = await tx.reviewCycle.deleteMany();
      const r7 = await tx.employeeHistory.deleteMany({ where: { type: 'PERFORMANCE' } });
      const r8 = await tx.notification.deleteMany({ where: { OR: [{ link: { contains: '/reviews/' } }, { title: { contains: 'Appraisal' } }] } });
      
      return { r1, r2, r3, r4, r5, r6, r7, r8 };
    });

    console.log('Domain Sanitized Successfully.');
    console.log('Records Purged:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('SYSTEM WIPE FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

masterWipe();
