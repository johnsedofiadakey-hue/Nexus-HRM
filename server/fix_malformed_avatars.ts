import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Data Integrity Audit: Purging "apidata:" corruptions...');

  // 1. Audit Users
  const usersWithCorruptAvatars = await prisma.user.findMany({
    where: {
      OR: [
        { avatarUrl: { contains: 'apidata:' } },
        { profilePhoto: { contains: 'apidata:' } },
        { nationalIdDocUrl: { contains: 'apidata:' } }
      ]
    }
  });

  console.log(`🔍 Found ${usersWithCorruptAvatars.length} users with corrupted image strings.`);

  for (const user of usersWithCorruptAvatars) {
    const updateData: any = {};
    if (user.avatarUrl?.includes('apidata:')) {
      updateData.avatarUrl = user.avatarUrl.replace('apidata:', 'data:');
    }
    if (user.profilePhoto?.includes('apidata:')) {
      updateData.profilePhoto = user.profilePhoto.replace('apidata:', 'data:');
    }
    if (user.nationalIdDocUrl?.includes('apidata:')) {
      updateData.nationalIdDocUrl = user.nationalIdDocUrl.replace('apidata:', 'data:');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    console.log(`✅ Fixed user: ${user.fullName} (${user.email})`);
  }

  // 2. Audit Organizations
  const orgsWithCorruptLogos = await prisma.organization.findMany({
    where: {
      logoUrl: { contains: 'apidata:' }
    }
  });

  console.log(`🔍 Found ${orgsWithCorruptLogos.length} organizations with corrupted logo strings.`);

  for (const org of orgsWithCorruptLogos) {
    if (org.logoUrl?.includes('apidata:')) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          logoUrl: org.logoUrl.replace('apidata:', 'data:')
        }
      });
      console.log(`✅ Fixed organization: ${org.name}`);
    }
  }

  console.log('✨ Data Integrity Audit Complete.');
}

main()
  .catch((e) => {
    console.error('❌ Audit failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
