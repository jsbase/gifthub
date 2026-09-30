import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GROUP_NAME = 'testgroup';
const GROUP_PASSWORD = 'test123';

async function main() {
  // Reset in FK-safe order so re-seeding is idempotent.
  await prisma.gift.deleteMany();
  await prisma.userGroup.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();

  const password = await bcrypt.hash(GROUP_PASSWORD, 10);
  const group = await prisma.group.create({
    data: { name: GROUP_NAME, password },
  });

  const members = [
    { name: 'Alice', gifts: [{ title: 'Mechanical keyboard', url: 'https://example.com/keyboard' }, { title: 'Desk lamp' }] },
    { name: 'Bob', gifts: [{ title: 'Noise cancelling headphones', isPurchased: true }] },
    { name: 'Charlie', gifts: [] },
  ];

  for (const member of members) {
    const user = await prisma.user.create({
      data: { name: member.name, password: await bcrypt.hash('demo', 10) },
    });

    const userGroup = await prisma.userGroup.create({
      data: { userId: user.id, groupId: group.id },
    });

    for (const gift of member.gifts) {
      await prisma.gift.create({
        data: {
          title: gift.title,
          url: gift.url,
          description: gift.description,
          isPurchased: gift.isPurchased ?? false,
          groupId: group.id,
          forMemberId: userGroup.id,
        },
      });
    }
  }

  console.log(`Seeded group "${GROUP_NAME}" with ${members.length} members.`);
  console.log(`Login with ${GROUP_NAME} / ${GROUP_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
