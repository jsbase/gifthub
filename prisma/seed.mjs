import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'test1234';

// The four `deleteMany` calls below are unfiltered: they empty `gift`, `listAccess`,
// `list` and `account` in whatever database DATABASE_URL names. In CI that is
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
//     host out of the repository entirely - the value lives only in CI secrets and
//     in each developer's own env files.
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
      `${WIPE_MARKER} is ${JSON.stringify(process.env[WIPE_MARKER] ?? '')} instead of ${JSON.stringify(WIPE_MARKER_VALUE)}`
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
          'Either the connection is misconfigured or the expectation is stale; neither is safe to wipe through.'
      );
    }
  }

  if (reasons.length > 0) {
    console.error(
      [
        'Refusing to seed: this script deletes every row in gift, listAccess, list and account.',
        ...reasons.map((r) => `  - ${r}`),
        '',
        `Set ${WIPE_MARKER}=${WIPE_MARKER_VALUE} to confirm DATABASE_URL points at a throwaway database (a Neon branch, not the parent the deployed app uses), then re-run.`,
      ].join('\n')
    );
    process.exit(1);
  }
}

async function main() {
  assertDisposableTarget();

  // Reset in FK-safe order so re-seeding is idempotent.
  await prisma.gift.deleteMany();
  await prisma.listAccess.deleteMany();
  await prisma.list.deleteMany();
  await prisma.account.deleteMany();

  const password = await bcrypt.hash(PASSWORD, 10);

  /*
    Three accounts rather than one, because the product no longer has a shared
    credential and a demo that cannot demonstrate sharing is a demo of nothing.
    `.test` is reserved by RFC 6761 precisely so nothing here can resolve or be
    delivered to a real mailbox.

    The addresses are stored the way `lib/email.ts` stores them - already
    lowercase, already trimmed - so a login in the specs that types `Anna@Example.test`
    finds this account rather than creating a second one. The nicknames are stored
    the way `lib/nickname.ts` stores them, for the same reason and with the same
    effect: the sign-in specs type `Anna` in one case and `anna` in another and must
    find the same account both times.

    Nickname and address are both unique, which is the property the sign-in route
    depends on - it resolves one field to at most one account and never has to ask
    which of two people was meant. Display names are the opposite, deliberately not
    unique, which is why they are a separate field rather than the same one.
  */
  const accounts = {};
  for (const [key, nickname, email, displayName] of [
    ['anna', 'anna', 'anna@example.test', 'Anna'],
    ['ben', 'ben', 'ben@example.test', 'Ben'],
    ['mia', 'mia', 'mia@example.test', 'Mia'],
  ]) {
    accounts[key] = await prisma.account.create({
      data: { nickname, email, displayName, password },
    });
  }

  // Anna's private list: the state a list starts in, and the one nobody else can see.
  const privateList = await prisma.list.create({
    data: {
      name: 'Für mich',
      visibility: 'PRIVATE',
      ownerId: accounts.anna.id,
    },
  });

  await prisma.gift.createMany({
    data: [
      {
        title: 'Mechanical keyboard',
        url: 'https://example.com/keyboard',
        listId: privateList.id,
      },
      { title: 'Desk lamp', listId: privateList.id },
    ],
  });

  /*
    Anna's shared list, with Ben added.

    One idea on it is already bought, and `purchasedById` names Ben. That field is
    never returned by any endpoint - the point of seeding it is that the e2e suite
    can exercise the one rule that depends on it: an owner looking at somebody
    else's mark may not clear it, and the spec asserts exactly that.
  */
  const sharedList = await prisma.list.create({
    data: {
      name: 'Weihnachten',
      visibility: 'SHARED',
      ownerId: accounts.anna.id,
    },
  });

  await prisma.listAccess.create({
    data: { listId: sharedList.id, accountId: accounts.ben.id },
  });

  await prisma.gift.createMany({
    data: [
      { title: 'Noise cancelling headphones', listId: sharedList.id },
      {
        title: 'Winter jacket',
        listId: sharedList.id,
        isPurchased: true,
        purchasedById: accounts.ben.id,
      },
    ],
  });

  // Ben's shared list, with Mia added, so the suite has a second shared list whose
  // audience does not overlap the first. That is what makes "Mia gets 404 for
  // Anna's list" a real assertion rather than a vacuous one.
  const bensList = await prisma.list.create({
    data: {
      name: 'Geburtstag',
      visibility: 'SHARED',
      ownerId: accounts.ben.id,
    },
  });

  await prisma.listAccess.create({
    data: { listId: bensList.id, accountId: accounts.mia.id },
  });

  await prisma.gift.createMany({
    data: [{ title: 'Kaffeemühle', listId: bensList.id }],
  });

  console.log('Seeded three accounts (sign in with the nickname or the address):');

  /*
    Destructured as a key and a nested pair.

    The array was written once with a flat `for (const [key, nickname, email] of
    Object.entries(...))` over values that are two-element arrays, so `nickname` was
    the whole pair and `email` was `undefined` - and the seed printed
    `anna: anna,anna@example.test / undefined`. The output was edited to look right
    before the loop was, which hid the fault rather than fixing it. Both halves of
    this are the shape of the code and not its wording: read the pair, then print it.
  */
  for (const [key, [nickname, email]] of Object.entries({
    anna: ['anna', 'anna@example.test'],
    ben: ['ben', 'ben@example.test'],
    mia: ['mia', 'mia@example.test'],
  })) {
    console.log(`  ${key}: ${email}  (nickname: ${nickname})`);
  }
  console.log(`Password for all three: ${PASSWORD}`);
  console.log("Anna's PRIVATE list 'Für mich' (2 open ideas)");
  console.log("Anna's SHARED list 'Weihnachten', shared with Ben (1 open, 1 bought by Ben)");
  console.log("Ben's SHARED list 'Geburtstag', shared with Mia (1 open idea)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });