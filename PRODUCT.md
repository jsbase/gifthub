# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: one member of a family or friend group. They open the app in two roles, sometimes in the same minute. As a **recipient**, they have written down what they would like and shared that list with the specific people they intend to buy from. As a **buyer**, they open somebody else's shared list to see what is still unclaimed before they buy something.

There is a real account per person: a unique nickname, an email address, a password, and a display name. **The nickname is the handle you sign in with; the display name is what other people see, and the two are deliberately different.** Display names are not unique — two accounts are both called Anna — so they cannot identify anybody; the nickname and the address are both unique and either will get you in. **Each person owns their own lists.** A list starts private, visible only to the person who made it, and becomes shared when its owner says so. A shared list is visible to exactly the accounts its owner added, directly or through a group they own, and to nobody else — there is no link, no public page, no directory, and no way to enumerate a list.

A person added to somebody else's list is a **buyer**: they may read it and mark an idea as bought, and that is all. They cannot add ideas to it, rename it, change its visibility, share it again, or delete it. The person who owns the list writes their own ideas down; nobody writes onto their sheet.

The German-first default locale, Cyrillic-capable type, and the deliberately large touch targets all point to a real multilingual family audience (de/en/ru), not an English-only demo. Users are not technical. There is no email verification, no password reset and no profile editing, because each of those is a flow this audience would hit and the product would then have to support.

**Intended future direction:** none that the product has decided on. The account model is per-person and durable, and the shared group password it replaced is gone. Future work should build on accounts and lists, not on any assumption that a list is reachable by anyone who knows a name and a password.

## Product Purpose

wishy gives one person a list of gift ideas and lets them share it with the specific people who will buy from it, so nobody buys the same present twice.

The job has two halves that are easy to confuse. One is *coordination*: a shared record of what is wanted and which of those things are already covered. The other is *surprise*: the person being celebrated should not be able to see a list that would spoil it. They are equally load-bearing — a coordination tool that leaks the surprise is worse than useless at a birthday.

The surprise is now a decision the recipient makes rather than a property the system provides. Nobody can see a list until its owner shares it with them by name, and a list that has been shared is no longer secret from the people it was shared with. What the system still guarantees is that **nobody else** can reach it: no link, no public page, no directory, and no way to enumerate a list's audience. The single lookup that exists is the one an owner uses to name somebody they already have in mind. Success means: an idea gets written down within seconds of occurring, its owner shares it, and the people it was shared with find out the moment one of them buys something. The unit of success is a gift bought exactly once, by someone who knew it was needed.

## Positioning

The mechanism a neighbouring product could not truthfully copy is the **bought flag as a shared mark rather than a personal check-off**. Most wishlist tools let each person tick off what they personally intend to buy. wishy's mark is visible to everyone the list is shared with immediately, which is what makes double-buying structurally impossible rather than a matter of good manners. Three consequences follow and are load-bearing:

- **Bought items recede, not disappear.** A bought idea stays struck through and stays on the list, because the people it was shared with still need to see the history of what was covered. Open items carry the visual weight.
- **Empty and complete are different states.** A list with no ideas at all is the one that most needs a present, and a list whose ideas are all bought is not. The product refuses to conflate them, and the count language says which is which.
- **The buyer is never named.** The owner sees which ideas are bought and how many are left, but not who bought them. Attribution is stored and never shown, which is what keeps a partly-completed list from spending the surprise before the day.

The mark is shared, but it is not unfalsifiable. An owner may put the mark on an open idea — "I already got this myself" — and may take back a mark they set. They may **not** clear a mark somebody else set, because the owner is precisely the person most likely to have changed their mind about a gift, and a mark that erases is a double-buy.

## Operating Context

- **Moments of use:** standing in a shop with a half-formed idea and writing it onto your own list; and, a second later or a month later, opening somebody else's shared list to see what is still unclaimed before buying something. The first moment is why inputs are sized for a thumb and the registration form is three short fields; the second is why a list is a scannable set of ideas with counts rather than a page of settings.
- **The physical object this resembles:** a bound family album, one sheet per occasion, with ideas written into a grid of cells. The interface follows that: a board, a sheet, a grid, one kind of mark. This is the standing visual metaphor; `DESIGN.md` holds the system.
- **Who writes what:** only the owner writes onto their own list. Sharing makes a list readable by named people; it never makes it writable by them.
- **Ritual:** the mark. Marking an idea bought is the one moment in the product with ceremony attached: the cell inverts, and the row's rule fills further. It is the only place colour changes meaning, and it is a shared, permanent mark rather than a personal tick.
- **Environment:** deployed on Vercel against a Postgres database (Neon in practice). Local development requires the same environment values in both `.env` and `.env.local` because Next.js and the Prisma CLI read different files.

## Capabilities and Constraints

**Built and working:**
- Account registration by nickname, email address and password; sign-in by nickname **or** email address; session JWT; logout. No address verification and no password reset, deliberately — there is no mail provider and this audience would hit both flows.
- Lists owned by an account, each either private or shared, renameable and deletable.
- Sharing a list with a specific person by email address or nickname, and withdrawing it again. Sharing an address that has no account behind it is refused with a message that says what to do instead.
- Sharing a list with a whole group at once, where every member gets exactly the access an individual invitation gives. Removing somebody from a group withdraws their access to the lists shared with it, and their own individual grant, if they had one, survives that. A group is a named collection of real accounts and has no credential of its own — nothing about it is reachable by knowing a name. The owner's sheet names those groups under "Shared with" beside the people added directly, so a list reachable only through a group never reads as shared with nobody.
- Gift ideas on a list: title (required), description (optional), URL (optional), and a purchased flag.
- Marking an idea bought and taking it back, by the owner and by the people the list is shared with.
- Copying or moving ideas between the account's own lists, in a batch: the owner picks the verb on the source sheet, ticks the ideas, then names the destination. A **copy** arrives as an open idea with no mark, and the original keeps its own. A **move** keeps the idea's mark, since the idea itself has not changed. A batch lands whole or not at all (at most 100 ideas per request), and sending it again is harmless.
- One contents page with the account's own lists and the lists shared with it, each with a per-list count of open ideas.
- Three locales (de default, en, ru) with a language switcher, full dictionaries, and typefaces that carry Latin and Cyrillic.
- Dark mode following the system preference.
- Toast notifications for every mutation outcome.
- A voluntary support link in the footer, opening `ko-fi.com/wishyapp` in a new tab. It is the only link in the app's own chrome that leaves it; see the first unfulfilled claim below for what it may and may not become.
- Playwright end-to-end coverage for the app shell (including the footer's support link, at 390px in German and Russian), account auth, the contents page, the landing page, sharing and group permissions (including the group-reach sheet), gift fields, the transfer flow and language switching.

**Deliberately removed, not forgotten:** writing an idea onto somebody else's list. The group model made it a working capability — any member could write onto any member's sheet — and the per-list model does not have it. The owner of a list curates their own list; the people it is shared with buy from it. This is a removal, not an omission.

**Confirmed constraints future work must preserve:**
- **Access is by named grant, never by possession.** A shared list is reachable only by an account its owner added, or by an account sitting in a group its owner added. Do not add a link, a public page, or any way to enumerate lists. Accounts have no directory page and are not listed publicly. The one exception is the lookup an owner uses *inside the sharing dialog* to name somebody they already have in mind: it matches an address or a nickname, and it answers only a signed-in account that owns at least one list. That lookup is the widening this rule permits, and its bounds are in `lib/account-search.ts` — three characters minimum, eight results, no total, the caller excluded. **The absence of a public face for a list is still the feature.**
- **A reader who cannot act on a list is not offered the action.** Controls a person may not use are absent, not disabled. A buyer looking at an owner-only toolbar of greyed-out buttons cannot tell a rule from a bug.
- **Deleting a list destroys every idea on it, irreversibly.** This is the highest-stakes action in the app and has a dedicated confirmation that states the cascade. Exactly one other control destroys anything: deleting a group, which takes it out of every list it was shared with, so anybody who was reaching one of those lists only through that group stops. It has its own confirmation naming the group and that consequence. Apart from those two, no control in the product destroys anything: sharing a list back to private closes the reads and keeps the people on it.
- **The bought mark is shared and the buyer is unnamed.** Never expose who set a mark. Never let an owner clear a mark somebody else set — that is the double-buy this product exists to prevent.
- **A transfer is an owner's act on two lists they own.** The source must be one the caller may write to; the destination must be the caller's own list, and naming anybody else's is answered as if it did not exist rather than with "that list exists and is not yours". A list the caller may only read is not a destination: being able to see a sheet is not a reason an idea may be written on it, which is also why transfer does not reopen the removal above. A move re-points an idea and destroys nothing, so it adds no destructive control to the count in the next point.
- **Long German and Russian strings are a first-class layout constraint.** Two labels do not fit side by side at 390px. Any new row of controls must be assumed to break in German before it is checked in English.
- **Typeface loading requires Latin *and* Cyrillic subsets** for both families. A new font without a Cyrillic subset is a bug.

**Unfulfilled claims — treat as off-limits until implemented (confirmed):**
- **Premium / payment model.** None exists and none is promised. The privacy policy used to describe storing payment methods, transaction data and payment status for a premium membership; that section has been removed rather than left standing as a claim. Do not surface, imply, or design toward a paid tier. **The one permitted neighbour is voluntary support (confirmed):** the README links `ko-fi.com/wishyapp` as a way to cover the hosting and database costs, and the app carries one discreet link to it. It stays voluntary, unlocks nothing, makes no difference between people who give and people who do not, and needs no payment data held by wishy. **Settled:** it is a single footer link beside the privacy policy and the terms, led by a ☕ and worded "Spendier mir einen Kaffee" / "Buy me a coffee" / "Угости меня кофе", and the privacy policy says in section 5 that it leaves for a third party and that wishy passes no data on to it.
- **Occasions and deadlines.** There is no date, occasion or deadline anywhere in the schema. An earlier README claimed "track special occasions and deadlines"; it no longer does, and the absence is the point. Do not build on that claim as though the data model supports it.
- **Operator details are placeholders.** Privacy policy section 2 contains unfilled `[Operator's Name] [Address] [Email Address] [Phone Number]`. The app is deployed publicly, so this is a known legal gap, not a design detail.

## Brand Commitments

- **Name:** wishy. The mark is a tag glyph beside the wordmark — deliberately not a present, because the subject is a list of things other people are going to wrap and hand over.
- **Wordmark and a person's own name are set in a serif; everything else is sans.** When an authenticated user is present, the header shows their display name in place of the product name, so the product reads as that person's list rather than as a tool. Preserve that substitution. The display name is required rather than optional precisely so this never falls back to an email address.
- **Voice:** plain, short, and specific. Feature headings are claims with consequences ("Never the same gift twice"), not adjectives. Confirmations state the actual consequence and what cannot be undone. The three feature sentences describe behaviour, never features of the software. The landing page opens on a **question** and answers it in the three verbs underneath, which is deliberately not a claim with consequences: a reader has used nothing yet, so the page asks where they are before it tells them what they get. That answer belongs to the three claims below the fold, which is why they are the page's whole argument.
- **Copy is a product asset:** the dictionaries are the authoritative wording, and a change to a feature heading is a change to the product's claim, not a copy tweak.
- **Interface language follows the route locale** and all three dictionaries are complete. A new string is un-done until it exists in de, en and ru.

## Evidence on Hand

- **Seed data:** `prisma/seed.mjs` creates three accounts — `anna@example.test`, `ben@example.test` and `mia@example.test`, all with the password `test1234` — so there is something to sign into immediately after setup. `.test` is reserved by RFC 6761, so no address can reach a real mailbox. The seed deliberately spans the permission model: a private list with nobody on it, a shared list with one bought idea attributed to a buyer, and a second shared list with a **disjoint** audience, so a test asserting that one account gets 404 for another's list is testing something real.
- **Landing-page preview copy:** **three of the reader's own lists on one plate**, one row per state — the open counts fall as the rows go down and the last one carries a green check where its figure stood — named for occasions rather than for people, printed under the contents page's own section head. The load-bearing claim is that the plate **quotes** the real contents page rather than mocking it up: its parts are the components the app itself renders, so it cannot drift from what the app shows, its numbers and its count words are the shipped dictionary's, and the arc is legible without sight of it because every row carries the count words behind the figure.
- **Dictionary files** (`lib/translations/{de,en,ru}.json`) contain the full approved copy, including the three feature claims, the four count states, and all confirmation wording.
- **End-to-end tests** (`tests/`) exercise the real app shell, account auth, the contents page, the landing page, the language switcher, gift fields, the transfer flow, and the sharing and group permissions — including that a buyer cannot add, rename, change visibility, re-share or delete, and that an owner cannot clear somebody else's mark.
- **Assets:** favicon set, maskable icon, apple-touch icon, three SVG flags (de/en/ru), a loading spinner SVG.

**Absences future work must not fabricate:** no testimonials, no customer logos, no usage metrics, no pricing, no download or install counts, no press. There is no published legal entity. An earlier README's "occasions and deadlines" is not evidence of shipped capability.

## Product Principles

1. **The surprise is the owner's to give, and the system's job is to keep it from everyone else.** Sharing a list with named people is a deliberate act by the person it is about. Anything that would let an account that was *not* named read a list is a defect, whatever it costs. Read paths and list boundaries are a product concern, not just a permission concern.
2. **The mark is shared.** An idea's bought state belongs to everyone the list is shared with, at the moment it is set. Never scope it to one person — except that an owner may not clear a mark somebody else set, because the owner is the one account with a reason to want it gone.
3. **Frictionless admission, real security.** Three fields and a submit get an account in; there is no verification mail and no reset flow, because this audience is not technical and every flow added is a flow that must then be supported. What sits behind those three fields is nonetheless real identity and real access control, and should not be described as anything less in the interface. The privacy policy has to match: an email address and a password are stored per account.
4. **Empty is not the same as done.** A list with no ideas and a list with nothing left to buy are different situations and the interface must be able to say which.
5. **Write it down in seconds.** The capture path is the product's most-used moment. Nothing about adding an idea should take longer than noticing it.
6. **Say what will happen before it happens.** Deleting a list is destructive and cascades to every idea on it; the confirmation states the consequence and the irreversibility. Nothing else in the product destroys anything, and a control that looks destructive but is not should say what it actually does.

## Accessibility & Inclusion

- **Multilingual by construction, not by translation pass.** de/en/ru are equally first-class. German and Russian are longer than English, so layout must be designed against the longest string, and a change that only looks right in English is not done.
- **Cyrillic is a hard requirement for type.** Both typefaces must load a Cyrillic subset; a Latin-only font breaks the product for Russian users.
- **Reduced motion is honoured globally.** All animation and transition collapses to a state change under `prefers-reduced-motion`, with the single exception of the loading spinner, which keeps spinning because a stopped spinner is a broken affordance.
- **One app-wide focus mechanism, two-tone by construction.** Every interactive element inherits a visible keyboard focus, and no single flat colour can meet contrast against both the light page and the red destructive fill — the indicator is a gap tone plus a ring tone. Do not introduce a second focus treatment per component.
- **Real touch-target minimums.** Form controls are 44px and primary dialog actions are 48px, because the product is used one-handed on a phone. This is a floor, not a preference.
- **Forms carry visible printed labels.** Every field has a small tracked label above it, not just a placeholder. A placeholder vanishes the moment the field is filled and a screen reader meets it only once; that was a known weakness of the previous design and it is fixed. Do not regress to placeholder-only.
- **No colour-only state.** A bought gift is distinguished by the inverted cell, the cart in the owner's ink, and the rule's fill — three channels, so the state survives a monochrome or colour-vision difference. The green check on a sheet with nothing left is likewise never the only signal.
