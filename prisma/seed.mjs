import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GROUP_NAME = 'testgroup';
const GROUP_PASSWORD = 'test123';

// The four `deleteMany` calls below are unfiltered: they empty `gift`, `userGroup`,
// `user` and `group` in whatever database DATABASE_URL names. In CI that is
// `CI_DATABASE_URL`, and nothing forces it to be a Neon *branch* rather than the
// parent the deployed app reads - a workflow comment asks for a branch, but a
// comment is not a check. So a misconfigured secret would destroy the demo data
// silently and completely, before any test runs and with nothing to look at
// afterwards.
//
// Hence an explicit marker rather than an inferred one. Two alternatives were
// considered and rejected:
//
//   - Compare the database name against the demo's. It does not discriminate:
//     `neondb` is Neon's default name on a branch exactly as it is on the parent,
//     so this refuses to seed the demo and still seeds the parent.
//   - Compare the host against the demo endpoint id. That discriminates, but it
//     means committing a Neon endpoint id into a tracked file, which publishes
//     infrastructure identity and rots the moment the project is renamed.
//
// A required env var does discriminate, needs no infrastructure detail, and
// leaves the choice with whoever set the secret. It has to fail, not warn: a
// warning is exactly the "quiet" outcome this guards against, and the job would
// go on to seed the parent. CI sets it on the seed step, so turning the CI
// database at the parent is a loud red build instead of an empty demo.
const WIPE_MARKER = 'SEED_ALLOW_WIPE';
const WIPE_MARKER_VALUE = '1';

function assertDisposableTarget() {
  const reasons = [];

  if (process.env[WIPE_MARKER] !== WIPE_MARKER_VALUE) {
    reasons.push(
      `${WIPE_MARKER} is ${JSON.stringify(process.env[WIPE_MARKER] ?? '')} instead of ${JSON.stringify(WIPE_MARKER_VALUE)}`,
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    reasons.push('DATABASE_URL is unset, so the wipe target cannot even be named');
  } else {
    try {
      new URL(url);
    } catch {
      reasons.push('DATABASE_URL is not a parseable connection string');
    }
  }

  if (reasons.length > 0) {
    console.error(
      [
        'Refusing to seed: this script deletes every row in gift, userGroup, user and group.',
        ...reasons.map((r) => `  - ${r}`),
        '',
        `Set ${WIPE_MARKER}=${WIPE_MARKER_VALUE} to confirm DATABASE_URL points at a throwaway database (a Neon branch, not the parent the deployed app uses), then re-run.`,
      ].join('\n'),
    );
    process.exit(1);
  }
}

async function main() {
  assertDisposableTarget();

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
