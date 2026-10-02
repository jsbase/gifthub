# wishy

wishy gives one group a single shared list of gift ideas, so nobody in it buys the same present twice. A `Group` is a name plus a shared password; there is no per-person account, and a `User` row is a member name recorded inside the group. Marking an idea bought is one shared, permanent, group-wide mark rather than a personal tick, which is what makes double-buying impossible instead of merely discouraged; bought ideas stay on the list, struck through. Three locales ship: de (default), en, ru.

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

The seed is `prisma/seed.mjs`. It deletes every row in `gift`, `userGroup`, `user` and `group` with no filter, so it refuses to run unless `SEED_ALLOW_WIPE=1` is set. If `SEED_EXPECT_HOST` is also set, it refuses to run unless the host in `DATABASE_URL` matches it exactly; CI always sets it, locally it is optional. It creates group `testgroup` with password `test123` and three members.

Run the app:

```bash
npm run dev   # http://localhost:3000, the port is explicit in the dev script
```

Tests: `npm run test:e2e`, plus `:ui`, `:headed` and `:debug` variants. There are no unit tests; `tests/` holds four Playwright specs covering the app shell, auth buttons, dashboard and language switcher.

## Deploy notes

- Vercel builds the Next.js app. The database is hosted Postgres (Neon) reached through `DATABASE_URL` and `DIRECT_URL`.
- `preview` is the integration branch, `main` is production.
- CI is a single workflow, `.github/workflows/playwright.yml`, triggered on `pull_request`. It typechecks, lints, runs the ratchet and builds, then, when the database secrets are configured, applies `prisma migrate deploy`, seeds and runs the Playwright suite. Pull requests from forks cannot read repository secrets, so the database half is skipped for them.