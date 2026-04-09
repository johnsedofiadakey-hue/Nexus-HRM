import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { AppraisalService } from './src/services/appraisal.service';


const prisma = new PrismaClient();

async function runPurge() {
  console.log('🚀 Initiating Global Appraisal Remnant Purge...');
  
  // Get all organizations to be thorough
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  
  for (const org of orgs) {
    console.log(`\nScanning Organization: ${org.name} (${org.id})`);
    try {
      const result = await AppraisalService.cleanupOrphanedPackets(org.id);
      console.log(`✅ Success: Decommissioned ${result.count} orphaned packets.`);
    } catch (err) {
      console.error(`❌ Failed for ${org.name}:`, err);
    }
  }

  console.log('\n✨ Global Purge Sequence Complete.');
  process.exit(0);
}

runPurge();
