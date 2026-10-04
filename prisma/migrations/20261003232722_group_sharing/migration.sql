-- Groups, group membership, and sharing a list with a group.
--
-- `Group.name` is unique per owner and not globally, which is the one decision in
-- this migration that the old `Group` got wrong rather than merely dated. It had
-- `name` as a bare `@unique` - `Group_name_key`, one name for the whole database -
-- and a global namespace is not a stricter version of what is wanted here, it is a
-- different claim: "Family" is a name inside one household, so a global constraint
-- says two families cannot both be called "Family", and the second of them has to
-- invent "Family 2" for a word nobody meant. `@@unique([ownerId, name])` says what
-- an owner actually promises, which is that *they* cannot have two groups under one
-- name, and it is the composite rather than a unique index on `name` alone.
--
-- A member's reach is derived from `GroupMember` on every read, and is deliberately
-- not written down anywhere. The alternative - expanding a group grant into one
-- `ListAccess` row per current member at grant time - means a removal has to *delete*
-- rows, so every row needs provenance recording which grant created it, and it still
-- cannot reach members added to the group afterwards without a backfill. The stored
-- audience drifts from the group either way. Derived, a removal changes the answer on
-- the next read because there is no stored row left to go stale, and an addition needs
-- no backfill at all. It also gets the awkward case right without being told: an
-- account holding both an individual grant and a group grant keeps its access when it
-- is removed from the group, because the individual `ListAccess` row is still there
-- and the read predicate is an `OR`. A snapshot design has to be instructed to
-- preserve that, and an instruction is a thing a later change can forget.
--
-- Additive only, and there is no data step: every table below is created empty, so
-- there is nothing to backfill, and nothing existing is altered but `Account`, which
-- gains two indexes and no columns.
--
-- Those two indexes are for `GET /api/accounts/search`, and they are written by hand
-- because `schema.prisma` has no syntax for an index on an expression:
--
--   CREATE INDEX "Account_nickname_lower_idx"
--     ON "Account" (lower("nickname") text_pattern_ops);
--   CREATE INDEX "Account_email_lower_idx"
--     ON "Account" (lower("email") text_pattern_ops);
--
-- A plain btree can only serve `LIKE 'prefix%'` when the column's collation is C (or
-- POSIX); under a locale collation such as `en_US.UTF-8` the planner will not use it,
-- because the index is ordered by collation rules rather than by the bytes a prefix
-- pattern compares. `text_pattern_ops` gives a btree ordered by byte value, which is
-- what a prefix match needs. `pg_trgm` was the other candidate and was rejected: it
-- exists to serve `contains` and similarity, this search is a prefix search, and it
-- would cost more to build and to maintain for the wrong operator.
--
-- The `lower()` calls are a no-op on the data as stored and stay one. `email` is
-- stored trimmed and lowercased and `nickname` lowercased, so a lowercased query
-- already matches byte for byte. They are there to make that an explicit property of
-- the index instead of an assumption about two columns written elsewhere, and to keep
-- the index correct if a future writer ever stops lowercasing.
--
-- One consequence of writing them by hand: they exist in the database but not in
-- `schema.prisma`, so `prisma migrate dev` reads them as drift and will offer to drop
-- them. If it does, re-create them rather than accepting the drop - the prefix search
-- falls back to a sequential scan without them, which on a small install looks
-- exactly like it still works.

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListGroupAccess" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListGroupAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_ownerId_name_key" ON "Group"("ownerId", "name");

-- CreateIndex
CREATE INDEX "GroupMember_accountId_idx" ON "GroupMember"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_accountId_key" ON "GroupMember"("groupId", "accountId");

-- CreateIndex
CREATE INDEX "ListGroupAccess_groupId_idx" ON "ListGroupAccess"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ListGroupAccess_listId_groupId_key" ON "ListGroupAccess"("listId", "groupId");

-- The two expression indexes described in the header. `startsWith` reaches the
-- database as `LIKE 'prefix%'`, which is a pattern match and not an equality, so the
-- unique indexes on `email` and `nickname` do not serve it and neither does a plain
-- btree under a locale collation.
CREATE INDEX "Account_nickname_lower_idx" ON "Account" (lower("nickname") text_pattern_ops);

CREATE INDEX "Account_email_lower_idx" ON "Account" (lower("email") text_pattern_ops);

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListGroupAccess" ADD CONSTRAINT "ListGroupAccess_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListGroupAccess" ADD CONSTRAINT "ListGroupAccess_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;