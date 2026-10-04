# AGENTS.md

Instructions for agents and subagents working in this repository. Verify anything here against the file it points at before relying on it; this file is a map, not a substitute for reading the code.

## What this is

wishy gives one person a list of gift ideas and lets them share it with the specific people who will buy from it, so nobody buys the same present twice. There is a real account per person: a unique nickname, an email address, a password, and a display name. Sign-in takes either the nickname or the address in one field, both of which are unique; the display name is not unique and is derived from the nickname at registration. Every list belongs to exactly one account and is either `PRIVATE` (owner only) or `SHARED` (only the accounts the owner added, directly or through a group they own — no link, no public page, no directory). A `Group` is a named collection of real accounts owned by one account, with no password of its own; reaching a list through one is *derived* from membership rather than stored, so removing a member revokes access with no row to fall out of step. A person added to somebody else's list is a *buyer*: they may read it and mark an idea bought, and nothing else — including a group member, who gets exactly the same column of the permission table. Marking an idea bought is a shared mark rather than a personal tick, which is what makes double-buying impossible instead of merely discouraged; bought ideas stay on the list, struck through, and the buyer is never named. Three locales (de default, en, ru), deployed to Vercel at https://wishy-store.vercel.app/. Next.js 16 App Router, React 19, Tailwind v4, Prisma against Postgres.

## Directory map

- `app/` — App Router. `app/[lang]/` holds the localized routes: `page.tsx` (landing), `dashboard/page.tsx` (the contents page: your lists and shared with you), `list/[id]/page.tsx` (one sheet), `privacy/`, `terms/`; `dictionaries.ts` lazily imports the locale JSON, caches it, and falls back to `defaultLocale` rather than a literal. `app/api/` holds the route handlers: `auth/{login,logout,register,verify}`, `lists`, `lists/[id]`, `lists/[id]/access`, `lists/[id]/access/[accessId]`, `lists/[id]/gifts`, `lists/[id]/gifts/[giftId]`, `lists/[id]/gifts/[giftId]/toggle`. Handlers are adapters — they parse a request, call a `lib/` module, and map the outcome to a status. `app/globals.css` is the design-token source of truth (Tailwind v4 `@theme inline`, every token defined in both themes). `app/sw.ts` registers the service worker.
- `components/` — UI modules, one concern per file. `components/ui/` holds the Radix/shadcn-style primitives (`button`, `dialog`, `dropdown-menu`, `input`, `label`, `sonner`, `textarea`) configured by `components.json`. `components/service-worker.tsx` mounts `app/sw.ts`.
- `lib/` — `auth.ts` (browser fetch wrappers), `auth-server.ts` (`requireAccountId` and `requireAccount`, the server-side JWT), `prisma.ts` (client singleton), `list-access.ts` (**the entire authorization surface** — the permission table is in its header comment), `refusals.ts` (the closed `Refusal` vocabulary shared by routes and client), `gift-count.ts` (a sheet: counts and the four count states), `account-name.ts` (what a display name may be, and the password rule), `email.ts` (what an address may be, and its normalization), `nickname.ts` (what the unique sign-in handle may be), `cookie.ts` (whether a cookie served on this request may be marked `Secure`), `api-refusal.ts` (the `Refusal` to status mapping, server-only), `member-ink.ts` (stable colour tray, keyed on the **owner** account id), `i18n-config.ts` (locale list and default), `utils.ts` (`cn`), `translations/{de,en,ru}.json`.
- `hooks/` — `use-debounce.ts` only.
- `prisma/` — `schema.prisma` (Postgres; `Account`, `List`, `ListAccess`, `Gift`), `migrations/`, and `seed.mjs`, which **deletes every row** before seeding. Read its guards before running it.
- `tests/` — two runners, one directory. The Playwright end-to-end specs sit at the top: `app`, `auth-buttons`, `dashboard`, `gift-fields`, `group-sheets`, `groups`, `landing`, `language-switcher`, `sharing`. `sharing.spec.ts` is the security surface and the most important test in the repo; `groups.spec.ts` is the second HTTP-only permission surface. `tests/unit/` holds `node --test` unit tests for the pure rule functions in `lib/` (`gift-text`, `gift-count`, `refusals`, `member-ink`, and the normalization rules), which `playwright.config.ts` excludes via `testIgnore` so Playwright does not collect them.
- How a unit test imports a `lib/` module — `node --test` runs the `.ts` files directly, and Node's resolver requires a real file extension and has no equivalent of the `@/*` path alias. An extensionless `../../lib/gift-text` fails at runtime with `ERR_MODULE_NOT_FOUND`, and a `.ts` extension fails `tsc` under this `tsconfig.json`, which does not set `allowImportingTsExtensions`. So each unit test bridges with `createRequire(import.meta.url)('../../lib/x.ts') as typeof import('@/lib/x')`: the specifier carries the extension Node needs, the cast carries the types TypeScript needs, and neither needs a config change. `import type { … } from '@/lib/…'` is still fine for types alone, because a type-only import is erased before resolution.
- `types.ts` — hand-written interfaces for every component prop and the whole translation dictionary surface. Single shared type file; see the serialization rules below. `Gift` deliberately has no `purchasedById`: the database has it, and the client's type is a strict subset so no endpoint can leak the buyer without a visible type change.
- `proxy.ts` — the Next 16 replacement for `middleware.ts`: locale negotiation plus the auth gate for the contents page and the list sheet.
- `public/sw.js` — the actual service worker, plus `offline.html`, `flags/`, `site.webmanifest`.
- `scripts/lint-ratchet.mjs` + `lint-baseline.json` — the lint warning gate. Read the script before touching either.
- `docs/` — not part of the repo. `/docs/` is gitignored (`.gitignore:70`) and nothing under it is tracked; it holds local planning and audit material from whichever session produced it. Do not read it as project truth, and do not expect a colleague to have it.
- `DESIGN.md` — the design system as YAML frontmatter (colour, type, spacing). `PRODUCT.md` — the product brief, including a list of unfulfilled README claims that are explicitly off-limits to build on.
- `.github/workflows/` — exactly one workflow, `playwright.yml`. It is the full CI gate.

## Commands

Verified against `package.json`.

```
npm install                  # postinstall runs `prisma generate`
npm run dev                  # next dev -p 3000
npm run build                # prisma generate && next build
npm run start                # next start
npm run lint                 # eslint .  — errors fail, warnings do not
npm run lint:ratchet         # fails on warnings absent from lint-baseline.json
npm run lint:baseline        # rewrite lint-baseline.json to accept current warnings
npm run test:unit            # node --test on the pure rule functions in tests/unit/
npm run test:e2e             # playwright test
npm run test:e2e:ui          # playwright test --ui
npm run test:e2e:headed      # playwright test --headed
npm run test:e2e:debug       # playwright test --debug
```

Setup, once, after `.env` and `.env.local` are filled in from `.env.example`:

```
npx prisma generate
npx prisma migrate deploy
SEED_ALLOW_WIPE=1 npx prisma db seed        # optionally also SEED_EXPECT_HOST=<host>
```

There is **no `test` script and no `typecheck` script** — do not invent or claim either. Typecheck is `npx tsc --noEmit`, which is what CI runs.

`npm run test:e2e` starts its own server via the `webServer` block in `playwright.config.ts`: `npm run dev` locally, `npm run start` under CI. It targets `NEXT_PUBLIC_BASE_URL` (default `http://localhost:3000`) and reads `.env.local`. The suite writes to the database through Prisma, so it needs a migrated, seeded database and valid `JWT_SECRET`. Locally it runs all five configured projects (chromium, firefox, webkit, Mobile Chrome, Mobile Safari); CI runs `--project=chromium` only.

## Conventions

**Branches.** Observed prefixes: `feature/`, `design/`, `refactor/` (current branch: `refactor/improve-codebase-architecture`). One unprefixed exception exists (`alert-autofix-3`). Branch new work from `preview`, not `main`.

**Commits.** Not Conventional Commits. The observed style is a short imperative sentence in sentence case — "Fix unvalidated dynamic method call", "Remove the `push` trigger for feature branches", "Update playwright.yml" — plus `Bump <dep> from <a> to <b>` from dependabot, plus bot-generated merge commits carrying the PR title and number. Do not add a `type(scope):` prefix.

**Review flow.** Feature branches are reviewed as pull requests into `preview`; CI runs on the pull request. `preview` is then merged into `main` by a pull request and re-checked. The `preview` branch is not pushed by hand — its history is bot-generated `Preview (#N)` / `Merge Preview (#N)` commits. `.github/workflows/playwright.yml` triggers on `pull_request` only; it deliberately has no `push` trigger, so a direct push to a feature branch runs no CI at all. Its header states that branch protection on `preview` and `main` requires the `Playwright / run-e2e-tests` check — treat that as the file's claim, not as something this repo can verify locally.

**Code style.** TypeScript, `strict: true`, `noEmit`. ES modules everywhere except `next.config.js` and `postcss.config.js`, which are CommonJS by requirement of their loaders (and exempted in `eslint.config.mjs`). Single quotes, semicolons, two-space indent, roughly 80 columns. There is no Prettier config and no Prettier dependency — that style is convention, not tooling, and nothing in CI enforces it. Functional components with hooks, typed as `const X: React.FC<Props> = ...`; prop interfaces live in `types.ts`, not next to the component. `'use client'` on anything interactive, `'use server'` in `app/[lang]/actions.ts`. Named exports are the default, though default exports do exist for module singletons and configs (`lib/prisma.ts`, `app/[lang]/dictionaries.ts`, `components/gift-card.tsx`, `playwright.config.ts`). Class composition goes through `cn()` from `lib/utils.ts`; inline Tailwind utilities otherwise. `data-testid` attributes are the e2e selectors — the specs depend on the exact strings.

**Comments.** This repo's comments are long and load-bearing. They explain *why* a decision was made, frequently citing measurements, accessibility ratios, and the bug that motivated the code. Match that: explain the reason and the alternative rejected, never restate what the line does. Do not add a comment to code that is self-evident, and do not delete an existing rationale comment as cleanup.

## Subagent guidance

Safe to parallelize: writing independent new files; read-only exploration; per-file review passes.

Must be serialized:

- Any two tasks touching the same file.
- Prisma migrations. `prisma migrate` takes Postgres advisory locks, and the pooled endpoint in transaction mode breaks them — that is why `DIRECT_URL` exists. Concurrent `migrate deploy` runs conflict.
- All git and branch operations.
- `types.ts`. It is one shared type surface that essentially every module imports.
- `app/globals.css` and the design tokens in it.
- The translation dictionaries. `de.json`, `en.json` and `ru.json` must move together, and the `Translations` interface in `types.ts` constrains them. A string added to one locale is a broken build in the other two.
- Anything with a visual or copy consequence under `DESIGN.md` and `PRODUCT.md` — read both before touching the design system or the landing-page claims.

Rules for every subagent:

- Do not commit, push, or open a pull request unless explicitly told to.
- Do not override the model. Let it inherit the session's model so the user's setting applies.
- Do not run `npm install`, start a dev server, or run a build without being asked.

## Definition of done

Run all of these, in this order, before calling any task complete:

1. `npx tsc --noEmit` — clean.
2. `npm run lint` — clean, zero errors.
3. `npm run lint:ratchet` — clean. This is a separate gate from `lint` and CI runs both; a new warning fails it even though `npm run lint` passes.
4. `npm run test:e2e` — passing, against a migrated and seeded database.
5. `npm run build` — succeeds.
6. `npm run test:unit` — green. Needs no database and no secrets, so it is a cheap gate and CI runs it: a change to a pure rule function in `lib/` fails in milliseconds rather than after a browser download.

Conditional:

- Translation strings changed → all three of `lib/translations/{de,en,ru}.json` updated, and the key present in the `Translations` interface in `types.ts`.
- Prisma schema changed → a migration exists under `prisma/migrations/` and `npx prisma migrate deploy` applies it cleanly.
- Pre-existing lint findings → do not "fix" them as a side effect and do not re-baseline to make a gate pass. The ratchet works like this: `scripts/lint-ratchet.mjs` runs ESLint, identifies each warning by file + rule + first line of prose (deliberately not line number, and not the code frame, which embeds an absolute path), and compares that multiset against `lint-baseline.json`. Duplicates count, so three `setState` calls in one file are three warnings and only the fourth is new. Shrinking the debt passes; only growing it fails. `npm run lint:baseline` rewrites the baseline to accept the current warnings — that is a deliberate, reviewable act, not a way to get to green. Note that `prisma/**` is globally ignored by ESLint, so Prisma files are not linted at all.
