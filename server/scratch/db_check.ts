import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProjectState() {
  console.log('--- AUDIT START ---');
  
  try {
    // 1. Enable AI for all Organizations (Priority)
    const orgs = await prisma.organization.findMany();
    console.log('\nOrganizations and AI status:');
    for (const o of orgs) {
      console.log(`- ${o.name} (${o.id}): AI Enabled = ${o.isAiEnabled}`);
      if (!o.isAiEnabled) {
          console.log(`  > Enabling AI for ${o.name}...`);
          await prisma.organization.update({
              where: { id: o.id },
              data: { isAiEnabled: true }
          });
      }
    }

    // 2. Investigate the broken packet
    const packetId = 'd38923ba-a605-4df9-8880-6b007b7e6690';
    console.log(`\nInvestigating packet: ${packetId}`);
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId },
      include: { 
          employee: { select: { fullName: true, organizationId: true } },
          cycle: { include: { organization: true } }
      }
    });

    if (packet) {
      console.log('Packet found!');
      console.log('Owner:', packet.employee.fullName);
      console.log('Organization:', packet.cycle.organization.name);
      console.log('Status:', packet.status);
    } else {
      console.log('Packet not found in database.');
      
      // Look for the closest match or verify if it belongs to someone else
      const latestPackets = await (prisma as any).appraisalPacket.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { employee: true }
      });
      console.log('\nRecent packets for reference:');
      latestPackets.forEach((p: any) => console.log(`- ${p.id} (${p.employee.fullName})`));
    }

  } catch (err: any) {
    console.error('Audit Error:', err.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n--- AUDIT END ---');
  }
}

checkProjectState();
