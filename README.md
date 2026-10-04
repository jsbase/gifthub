# wishy

wishy gives one person a list of gift ideas and lets them share it with the specific people who will buy from it, so nobody buys the same present twice. Every person has a real account — a unique nickname they sign in with, an email address, a password, and a display name other people see — and every list belongs to one account. Sign-in takes either the nickname or the address, in one field. A list starts private, visible only to its owner, and becomes shared when its owner adds specific people or a whole group. People are named either way — by nickname or by address, from one field. A person added to somebody else's list can read it and mark an idea as bought; they cannot add ideas to it, rename it, share it again, or delete it. There is no link, no public page and no directory: a shared list is reachable only by an account its owner named. Bought ideas stay on the list, struck through, and the person who bought them is never shown. Three locales ship: de (default), en, ru.

## Live URL

https://wishy-store.vercel.app/

## Tech stack

- Next.js 16 (App Router) with React 19
- TypeScript 5.9
- Tailwind CSS v4 via `@tailwindcss/postcss`
- Prisma 6 + PostgreSQL (Neon in practice)
- Radix UI primitives: dialog, dropdown-menu, label, slot
- `@tabler/icons-react` for icons
- `class-variance-authority`, `tailwind-merge` and `clsx` for variant and class composition
- `next-themes` for the dark mode switch, `sonner` for toasts
- `jose` for the session JWT, `bcryptjs` for password hashing
- `accept-language` for locale negotiation
- Playwright for end-to-end tests
- ESLint 9 (flat config) plus a lint warning ratchet (`npm run lint:ratchet`)

## Local setup

```bash
npm install   # postinstall runs `prisma generate`
```

Copy `.env.example` to **both** `.env` and `.env.local` and keep them in sync. Next.js reads `.env.local`, the Prisma CLI reads `.env`; a value present in only one works in one tool and fails in the other. Neither file may be committed.

```dotenv
DATABASE_URL=          # pooled connection string, used by the running app
DIRECT_URL=            # non-pooled connection string to the same database
JWT_SECRET=            # secret used to sign the session JWT
NEXT_PUBLIC_BASE_URL=  # base URL the app and the e2e tests talk to
```

`DIRECT_URL` is required by `prisma migrate`: the pooled endpoint sits behind a pooler in transaction mode, which breaks the advisory locks migrate relies on.

Set up the database:

```bash
npx prisma migrate deploy
SEED_ALLOW_WIPE=1 npx prisma db seed
```

The seed is `prisma/seed.mjs`. It deletes every row in `gift`, `listAccess`, `list` and `account` with no filter, so it refuses to run unless `SEED_ALLOW_WIPE=1` is set. If `SEED_EXPECT_HOST` is also set, it refuses to run unless the host in `DATABASE_URL` matches it exactly; CI always sets it, locally it is optional. It creates three accounts — `anna@example.test`, `ben@example.test` and `mia@example.test`, each with the password `test1234` — and three lists spanning the permission model: one private, one shared with a bought idea, and one shared with a *disjoint* audience so the suite can assert that an account gets 404 for a list it was never added to.

Run the app:

```bash
npm run dev   # http://localhost:3000, the port is explicit in the dev script
```

Tests: `npm run test:e2e`, plus `:ui`, `:headed` and `:debug` variants. There are no unit tests; `tests/` holds five Playwright specs covering the app shell, account auth, the contents page, the language switcher, and the sharing permissions. The sharing spec is the one that matters most: it asserts that an account added to somebody else's list can read it and set the bought mark, and *cannot* add an idea, delete one, rename the list, change its visibility, grant or revoke access, or delete it.

## Deploy notes

- Vercel builds the Next.js app. The database is hosted Postgres (Neon) reached through `DATABASE_URL` and `DIRECT_URL`.
- `preview` is the integration branch, `main` is production.
- CI is a single workflow, `.github/workflows/playwright.yml`, triggered on `pull_request`. It typechecks, lints, runs the ratchet and builds, then, when the database secrets are configured, applies `prisma migrate deploy`, seeds and runs the Playwright suite. Pull requests from forks cannot read repository secrets, so the database half is skipped for them.