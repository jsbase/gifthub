# wishy

One list of gift ideas, shared with exactly the people who will buy from it, so nobody buys the same present twice.

## What it is

Every person has a real account — a unique nickname they sign in with, an email address, a password, and a display name other people see — and every list belongs to one account.

Sign-in takes either the nickname or the address, in one field. A list starts private, visible only to its owner, and becomes shared when its owner adds specific people or a whole group. People are named either way — by nickname or by address, from one field.

A person added to somebody else's list can read it and mark an idea as bought; they cannot add ideas to it, rename it, share it again, or delete it. A group member gets exactly the same set of permissions, in both directions.

There is no link, no public page and no directory: a shared list is reachable only by an account its owner named.

Bought ideas stay on the list, struck through, and the person who bought them is never shown. Three locales ship: de (default), en, ru.

## Live URL

<https://wishy-store.vercel.app/>

## Tech stack

| Concern            | Choice                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router) with React 19                                        |
| Language           | TypeScript 5.9                                                               |
| Styling            | Tailwind CSS v4 via `@tailwindcss/postcss`                                   |
| Data               | Prisma 6 + PostgreSQL (Neon in practice)                                     |
| UI primitives      | Radix UI: dialog, dropdown-menu, label, slot                                 |
| Icons              | `@tabler/icons-react`                                                        |
| Class composition  | `class-variance-authority`, `tailwind-merge` and `clsx`                      |
| Theme and toasts   | `next-themes` for the dark mode switch, `sonner` for toasts                  |
| Auth               | `jose` for the session JWT, `bcryptjs` for password hashing                  |
| Locale negotiation | `accept-language`                                                            |
| End-to-end tests   | Playwright                                                                   |
| Linting            | ESLint 10 (flat config) plus a lint warning ratchet (`npm run lint:ratchet`) |

## Local setup

### 1. Install dependencies

```bash
npm install   # postinstall runs `prisma generate`
```

### 2. Configure the environment

Copy `.env.example` to **both** `.env` and `.env.local` and keep them in sync. Next.js reads `.env.local`, the Prisma CLI reads `.env`; a value present in only one works in one tool and fails in the other. Neither file may be committed.

```dotenv
DATABASE_URL=          # pooled connection string, used by the running app
DIRECT_URL=            # non-pooled connection string to the same database
JWT_SECRET=            # secret used to sign the session JWT
NEXT_PUBLIC_BASE_URL=  # base URL the app and the e2e tests talk to
```

> `DIRECT_URL` is required by `prisma migrate`: the pooled endpoint sits behind a pooler in transaction mode, which breaks the advisory locks migrate relies on.

### 3. Set up the database

```bash
npx prisma migrate deploy
SEED_ALLOW_WIPE=1 npx prisma db seed
```

The seed is `prisma/seed.mjs`. It deletes every row in `gift`, `listAccess`, `listGroupAccess`, `list`, `groupMember`, `group` and `account` with no filter, so it refuses to run unless `SEED_ALLOW_WIPE=1` is set. If `SEED_EXPECT_HOST` is also set, it refuses to run unless the host in `DATABASE_URL` matches it exactly; CI always sets it, locally it is optional.

It creates three accounts — `anna@example.test`, `ben@example.test` and `mia@example.test`, each with the password `test1234` — and three lists spanning the permission model: one private, one shared with a bought idea, and one shared with a *disjoint* audience so the suite can assert that an account gets 404 for a list it was never added to. It also creates a group `Family`, owned by Anna and holding Ben, which is the same person who is on a list individually — so "Ben keeps his access after leaving the group" is a meaningful assertion.

### 4. Run the app

```bash
npm run dev   # http://localhost:3000, the port is explicit in the dev script
```

## Tests

Two runners live side by side in `tests/`.

```bash
npm run test:unit    # node --test over the pure rule functions in lib/
npm run test:e2e     # playwright test
```

The end-to-end runner has UI variants: `npm run test:e2e:ui`, `npm run test:e2e:headed` and `npm run test:e2e:debug`.

`tests/unit/` holds five `node --test` files for the pure rule functions in `lib/` — gift text and count limits, refusal vocabulary, member colours, and nickname/email normalization. They need no database and no secrets, so they fail in milliseconds rather than after a browser download.

Nine Playwright specs sit at the top of `tests/`: the app shell, account auth buttons, the contents page, the language switcher, gift fields, the landing page, groups, group sheets, and sharing permissions.

Two of them matter more than the rest:

- **`sharing.spec.ts`** is the security surface and the most important test in the repo. It asserts that an account added to somebody else's list can read it and set the bought mark, and *cannot* add an idea, delete one, rename the list, change its visibility, grant or revoke access, or delete it.
- **`groups.spec.ts`** is the second HTTP-only permission surface, and asserts that an account holding both an individual grant and a group grant keeps its access when it leaves the group.

## Deploy notes

### Hosting

Vercel builds the Next.js app. The database is hosted Postgres (Neon) reached through `DATABASE_URL` and `DIRECT_URL`.

`preview` is the integration branch, `main` is production.

### Neon branches

The Neon project has exactly three long-lived branches, mapped onto Vercel's environments:

| Neon branch  | Vercel environment | Used by                  |
| ------------ | ------------------ | ------------------------ |
| `production` | Production         | the deployed app         |
| `preview`    | Preview            | preview deployments      |
| `dev`        | Development        | local development and CI |

Nothing creates a fourth. The Vercel Neon integration used to provision one database per git branch, which exhausted the free plan's ten-branch limit within days. `DATABASE_URL` and `DIRECT_URL` are therefore set as plain project variables rather than by an integration, and **a git-branch-scoped variable must never be reintroduced** — it is what made every branch its own database.

Because CI seeds `dev` and `prisma/seed.mjs` deletes every row, a CI run resets local development data to the seed fixture.

### CI workflows

| Workflow                           | Trigger                             | What it does                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/playwright.yml` | `pull_request`                      | The full gate. Typechecks, lints, runs the ratchet, runs the unit tests, builds, then — when the database secrets are configured — applies `prisma migrate deploy`, seeds and runs the Playwright suite. |
| `.github/workflows/label.yml`      | `pull_request`                      | Labels a pull request from the paths it modifies, using the rules in `.github/labeler.yml`.                                                                                                              |
| `.github/workflows/summary.yml`    | `pull_request`, `workflow_dispatch` | Posts an AI-written summary as a comment.                                                                                                                                                                |

Pull requests from forks cannot read repository secrets, so the database half of the Playwright job is skipped for them.n