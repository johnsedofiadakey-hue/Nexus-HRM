import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPacketOnly() {
  const packetId = 'd38923ba-a605-4df9-8880-6b007b7e6690';
  console.log(`Checking packet: ${packetId}`);
  try {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId }
    });
    if (packet) {
      console.log('Packet exists!');
      console.log(JSON.stringify(packet, null, 2));
    } else {
      console.log('Packet does NOT exist.');
      
      const count = await (prisma as any).appraisalPacket.count();
      console.log(`Total packets in DB: ${count}`);
      
      const latest = await (prisma as any).appraisalPacket.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: { employee: { select: { fullName: true } } }
      });
      console.log('\nLatest 3 packets:');
      latest.forEach((p: any) => console.log(`- ${p.id} (${p.employee.fullName})`));
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPacketOnly();
