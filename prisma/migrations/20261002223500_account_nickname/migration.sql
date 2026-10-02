-- Account.nickname: the unique handle a person signs in with.
--
-- Added after the fact rather than in `20261002195000_individual_accounts` because
-- it came out of reviewing that work: sign-in accepts a display name, display names
-- are deliberately not unique, and two accounts are both called Anna. The nickname
-- is the thing that resolves to exactly one row.
--
-- Added as three steps rather than one because the column is `NOT NULL` and there
-- are rows to backfill. A `NOT NULL` column with no default cannot be added to a
-- table that has any, and this one does.
--
--   1. nullable column
--   2. backfill from the display name, which is the closest thing to a handle that
--      already exists
--   3. NOT NULL + unique
--
-- The backfill has a collision guard. Two display names can reduce to the same
-- nickname - "Anna Berg" and "anna-berg" both strip to `annaberg` - and a unique
-- index built over colliding values fails at creation time rather than at insert.
-- The guard suffixes the later row with a slice of its own id, which is already
-- unique. It handles pairs; production holds no accounts at all and this branch
-- three, so a longer chain is not a case that has ever existed here.

ALTER TABLE "Account" ADD COLUMN "nickname" TEXT;

UPDATE "Account"
SET "nickname" = lower(
  regexp_replace("displayName", '[^[:alnum:]._-]', '', 'g')
);

-- Strip a leading separator left behind by a display name that began with one, so
-- the backfilled value satisfies the same rule the form enforces.
UPDATE "Account"
SET "nickname" = regexp_replace("nickname", '^[^[:alnum:]]+', '', 'g')
WHERE "nickname" !~ '^[[:alnum:]]';

UPDATE "Account" a
SET "nickname" = a."nickname" || '-' || substr(a."id", 1, 6)
WHERE EXISTS (
  SELECT 1
  FROM "Account" b
  WHERE b."nickname" = a."nickname"
    AND b."id" <> a."id"
    AND b."id" < a."id"
);

ALTER TABLE "Account" ALTER COLUMN "nickname" SET NOT NULL;

CREATE UNIQUE INDEX "Account_nickname_key" ON "Account"("nickname");