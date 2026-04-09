import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
import prisma from './src/prisma/client';

async function forceWipe() {
  console.log('--- FORCED SYSTEM PURGE INITIATED ---');
  try {
    await prisma.$transaction([
      prisma.appraisalReview.deleteMany(),
      prisma.appraisalPacket.deleteMany(),
      prisma.appraisalCycle.deleteMany(),
      prisma.performanceScore.deleteMany(),
      prisma.performanceReviewV2.deleteMany(),
      prisma.reviewCycle.deleteMany(),
      prisma.target.deleteMany({ where: { description: { contains: 'Appraisal' } } }),
      prisma.employeeHistory.deleteMany({ where: { type: 'PERFORMANCE' } }),
      prisma.notification.deleteMany({ where: { OR: [{ link: { contains: '/reviews/' } }, { title: { contains: 'Appraisal' } }] } })
    ]);
    console.log('All phantom records successfully decommissioned.');
  } catch (err) {
    console.error('Purge failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

forceWipe();
