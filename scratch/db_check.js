const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPacket() {
  const packetId = 'd38923ba-a605-4df9-8880-6b007b7e6690';
  console.log(`Checking packet: ${packetId}`);
  try {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId },
      include: { organization: true }
    });
    if (packet) {
      console.log('Packet found!');
      console.log('Organization:', packet.organization.name, '(', packet.organization.id, ')');
      console.log('Status:', packet.status);
      console.log('Stage:', packet.currentStage);
    } else {
      console.log('Packet not found in database.');
    }
    
    // Also check for all organizations and their isAiEnabled status
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, isAiEnabled: true }
    });
    console.log('\nOrganizations and AI status:');
    orgs.forEach(o => console.log(`- ${o.name} (${o.id}): AI Enabled = ${o.isAiEnabled}`));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPacket();
