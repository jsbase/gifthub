[![Playwright](https://github.com/jsbase/gifthub/actions/workflows/playwright.yml/badge.svg)](https://github.com/jsbase/gifthub/actions/workflows/playwright.yml)
[![CodeQL](https://github.com/jsbase/gifthub/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/jsbase/gifthub/actions/workflows/github-code-scanning/codeql)
[![Dependabot Updates](https://github.com/jsbase/gifthub/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/jsbase/gifthub/actions/workflows/dependabot/dependabot-updates)

# 🎁 GiftHub

> The smart way to organize and track gifts for your family, friends, and groups! Never buy duplicate presents or miss a special occasion again.

## 🎯 What is GiftHub?

GiftHub helps you manage gift-giving within your family or other groups. Create wishlists, track who's buying what, and ensure everyone gets something special - all while keeping the surprise! Perfect for birthdays, holidays, or any gift-giving occasion.

## ✨ Features

- 👨‍👩‍👧‍👦 Create and manage family/group gift lists
- 🎯 Add items to wishlists
- 🤫 Secretly mark items as "being bought"
- 📅 Track special occasions and deadlines
- 🎨 Modern UI with [Radix UI](https://www.radix-ui.com/) components
- 🌙 Dark mode support
- 🔒 Secure authentication
- 💅 Beautiful, responsive design

---

Built with [Next.js](https://nextjs.org) and bootstrapped using [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🛠 Setup

GiftHub keeps its data in PostgreSQL. Start from `.env.example` and copy it
to **both** `.env` and `.env.local`, then fill in the values: Next.js reads
`.env.local`, while the Prisma CLI reads `.env`, so a value that exists in
only one of the two works in one tool and fails in the other. Both files are
gitignored and have to stay that way — a filled-in copy is a secret.

- `DATABASE_URL` — pooled connection string, used by the running app
- `DIRECT_URL` — non-pooled connection string to the same database, used by
  `prisma migrate`; the pooled endpoint breaks the advisory locks it needs
- `JWT_SECRET` — secret used to sign the session JWT
- `NEXT_PUBLIC_BASE_URL` — base URL the app and the end-to-end tests talk to

Once the values are in place, set the database up:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
SEED_ALLOW_WIPE=1 npx prisma db seed
```

The seed creates the group `testgroup` with the password `test123` and three
members, so there is something to log in to right away.

`SEED_ALLOW_WIPE=1` is required because the seed empties `gift`, `userGroup`,
`user` and `group` before it writes anything, with no filter of any kind. It is
there to make that deletion a decision rather than a side effect of typing one
command.

It asserts *intent*, though, and intent can be wrong. If you also set
`SEED_EXPECT_HOST` to the hostname your `DATABASE_URL` points at, the seed
additionally refuses to run when the two disagree — so a connection string that
has been repointed by accident is caught rather than obeyed. CI always sets it;
locally it is optional.

## 🚀 Quick Start

1. Install dependencies:

```bash
npm install
```

2. Fire up the dev server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to see your app! 🎉

## 📚 Learn More

- 📖 [Next.js Documentation](https://nextjs.org/docs)
- 🎓 [Interactive Next.js Tutorial](https://nextjs.org/learn)
- 🐙 [Next.js GitHub Repository](https://github.com/vercel/next.js)

## 🚀 Deployment

Deploy with [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) - the platform from the creators of Next.js.

📚 Check out the [deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
