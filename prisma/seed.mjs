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
// Hence two independent checks rather than one inferred guess. Both fail, never
// warn: a warning is exactly the "quiet" outcome this guards against.
//
// 1. SEED_ALLOW_WIPE asserts *intent* - someone said "yes, wipe this". It is not
//    evidence that the target is throwaway, and on its own it would happily
//    empty the demo. Anything that sets it can also get it wrong.
// 2. SEED_EXPECT_HOST makes that assertion *falsifiable*. When set, the host of
//    DATABASE_URL must match it exactly. The operator names the database they
//    believe they are about to destroy; if the connection actually points
//    somewhere else, the two disagree and the seed stops.
//
// Two alternatives for check 2 were considered and rejected:
//
//   - Compare the database name against the demo's. It does not discriminate:
//     `neondb` is Neon's default name on a branch exactly as it is on the parent,
//     so this refuses to seed the demo and still seeds the parent.
//   - Commit the demo endpoint id here and compare against it. That would
//     discriminate, but it publishes infrastructure identity in a tracked file
//     and rots the moment the project is renamed. SEED_EXPECT_HOST keeps the demo
//     host out of the repository entirely - the value lives only in CI secrets.
//
// Check 2 is skipped when SEED_EXPECT_HOST is unset, so a bare local
// `SEED_ALLOW_WIPE=1 npx prisma db seed` still works. That is a real gap in the
// guard, accepted because a local run is a person standing at the terminal, not
// a misconfigured secret. CI does not accept it: the workflow refuses to seed
// unless SEED_EXPECT_HOST is present, so a misconfigured CI_DATABASE_URL is a
// loud red build rather than an empty demo.
const WIPE_MARKER = 'SEED_ALLOW_WIPE';
const WIPE_MARKER_VALUE = '1';
const EXPECT_HOST = 'SEED_EXPECT_HOST';

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
    let host = null;
    try {
      host = new URL(url).host;
    } catch {
      reasons.push('DATABASE_URL is not a parseable connection string');
    }

    const expected = process.env[EXPECT_HOST];
    if (expected !== undefined && host !== null && host !== expected) {
      reasons.push(
        `DATABASE_URL points at ${JSON.stringify(host)}, which is not the ${JSON.stringify(expected)} named in ${EXPECT_HOST}. ` +
          'Either the connection is misconfigured or the expectation is stale; neither is safe to wipe through.',
      );
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
