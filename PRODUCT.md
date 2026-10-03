# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: one member of a family or friend group. They open the app in two roles, sometimes in the same minute. As a **recipient**, they have written down what they would like and shared that list with the specific people they intend to buy from. As a **buyer**, they open somebody else's shared list to see what is still unclaimed before they buy something.

There is a real account per person: a unique nickname, an email address, a password, and a display name. **The nickname is the handle you sign in with; the display name is what other people see, and the two are deliberately different.** Display names are not unique � two accounts are both called Anna � so they cannot identify anybody; the nickname and the address are both unique and either will get you in. **Each person owns their own lists.** A list starts private, visible only to the person who made it, and becomes shared when its owner says so. A shared list is visible to exactly the accounts its owner added by email address and to nobody else — there is no link, no public page, no search, and no directory.

A person added to somebody else's list is a **buyer**: they may read it and mark an idea as bought, and that is all. They cannot add ideas to it, rename it, change its visibility, share it again, or delete it. The person who owns the list writes their own ideas down; nobody writes onto their sheet.

The German-first default locale, Cyrillic-capable type, and the deliberately large touch targets all point to a real multilingual family audience (de/en/ru), not an English-only demo. Users are not technical. There is no email verification, no password reset and no profile editing, because each of those is a flow this audience would hit and the product would then have to support.

**Intended future direction:** the premium model the privacy policy describes. The account model itself is now per-person and durable; the shared group password it replaced was provisional and is gone. Future work should build on accounts and lists, not on any assumption that a list is reachable by anyone who knows a name and a password.

## Product Purpose

wishy gives one person a list of gift ideas and lets them share it with the specific people who will buy from it, so nobody buys the same present twice.

The job has two halves that are easy to confuse. One is *coordination*: a shared record of what is wanted and which of those things are already covered. The other is *surprise*: the person being celebrated should not be able to see a list that would spoil it. They are equally load-bearing — a coordination tool that leaks the surprise is worse than useless at a birthday.

The surprise is now a decision the recipient makes rather than a property the system provides. Nobody can see a list until its owner shares it with them by name, and a list that has been shared is no longer secret from the people it was shared with. What the system still guarantees is that **nobody else** can reach it: no link, no public page, no search, no directory. Success means: an idea gets written down within seconds of occurring, its owner shares it, and the people it was shared with find out the moment one of them buys something. The unit of success is a gift bought exactly once, by someone who knew it was needed.

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
- Account registration by nickname, email address and password; sign-in by nickname **or** email address; session JWT; logout. No address verification and no password reset, deliberately � there is no mail provider and this audience would hit both flows.
- Lists owned by an account, each either private or shared, renameable and deletable.
- Sharing a list with a specific person by email address, and withdrawing it again. Sharing an address that has no account behind it is refused with a message that says what to do instead.
- Gift ideas on a list: title (required), description (optional), URL (optional), and a purchased flag.
- Marking an idea bought and taking it back, by the owner and by the people the list is shared with.
- One contents page with the account's own lists and the lists shared with it, each with a per-list count of open ideas.
- Three locales (de default, en, ru) with a language switcher, full dictionaries, and typefaces that carry Latin and Cyrillic.
- Dark mode following the system preference.
- Toast notifications for every mutation outcome.
- Playwright end-to-end coverage for the app shell, account auth, the contents page, sharing permissions and language switching.

**Deliberately removed, not forgotten:** writing an idea onto somebody else's list. The group model made it a working capability — any member could write onto any member's sheet — and the per-list model does not have it. The owner of a list curates their own list; the people it is shared with buy from it. This is a removal, not an omission.

**Confirmed constraints future work must preserve:**
- **Access is by named grant, never by possession.** A shared list is reachable only by an account its owner added. Do not add a link, a public page, a search, a directory, or any way to enumerate lists. The absence is the feature.
- **A reader who cannot act on a list is not offered the action.** Controls a person may not use are absent, not disabled. A buyer looking at an owner-only toolbar of greyed-out buttons cannot tell a rule from a bug.
- **Deleting a list destroys every idea on it, irreversibly.** This is the highest-stakes action in the app and has a dedicated confirmation that states the cascade. No other control in the product destroys anything: sharing a list back to private closes the reads and keeps the people on it.
- **The bought mark is shared and the buyer is unnamed.** Never expose who set a mark. Never let an owner clear a mark somebody else set — that is the double-buy this product exists to prevent.
- **Long German and Russian strings are a first-class layout constraint.** Two labels do not fit side by side at 390px. Any new row of controls must be assumed to break in German before it is checked in English.
- **Typeface loading requires Latin *and* Cyrillic subsets** for both families. A new font without a Cyrillic subset is a bug.

**Unfulfilled claims — treat as off-limits until implemented (confirmed):**
- **Premium / payment model.** The privacy policy describes storing payment methods, transaction data and payment status for a premium membership. Nothing in the codebase does this. Do not surface, imply, or design toward a paid tier.
- **Occasions and deadlines.** The README claims "track special occasions and deadlines". There is no date, occasion or deadline anywhere in the schema. Do not build on this claim as though the data model supports it.
- **Operator details are placeholders.** Privacy policy section 2 contains unfilled `[Operator's Name] [Address] [Email Address] [Phone Number]`. The app is deployed publicly, so this is a known legal gap, not a design detail.

## Brand Commitments

- **Name:** wishy. The mark is a tag glyph beside the wordmark — deliberately not a present, because the subject is a list of things other people are going to wrap and hand over.
- **Wordmark and a person's own name are set in a serif; everything else is sans.** When an authenticated user is present, the header shows their display name in place of the product name, so the product reads as that person's list rather than as a tool. Preserve that substitution. The display name is required rather than optional precisely so this never falls back to an email address.
- **Voice:** plain, short, and specific. Feature headings are claims with consequences ("Nobody buys it twice"), not adjectives. Confirmations state the actual consequence and what cannot be undone. The three feature sentences describe behaviour, never features of the software. The two **role** headings are the one deliberate exception: they are statements of situation ("Du hast etwas, das du dir wünschst"), because they answer "which one am I?" for somebody standing in front of the sign-in buttons, and a consequence has nothing to say to a reader who has not used the product yet. They are the frame around the three claims, not a fourth and fifth claim.
- **Copy is a product asset:** the dictionaries are the authoritative wording, and a change to a feature heading is a change to the product's claim, not a copy tweak.
- **Interface language follows the route locale** and all three dictionaries are complete. A new string is un-done until it exists in de, en and ru.

## Evidence on Hand

- **Seed data:** `prisma/seed.mjs` creates three accounts — `anna@example.test`, `ben@example.test` and `mia@example.test`, all with the password `test1234` — so there is something to sign into immediately after setup. `.test` is reserved by RFC 6761, so no address can reach a real mailbox. The seed deliberately spans the permission model: a private list with nobody on it, a shared list with one bought idea attributed to a buyer, and a second shared list with a **disjoint** audience, so a test asserting that one account gets 404 for another's list is testing something real.
- **Landing-page preview copy:** **one** list drawn three times in three states rather than three different lists — its open count falls 3 → 1 → 0 and only the third state carries the check, with the contents page's own section head and real count strings drawn from the shipped dictionary. The landing page quotes the actual contents page, not a mock-up, and the arc is legible without sight of it because every plate carries the dashboard's count words behind the figure.
- **Dictionary files** (`lib/translations/{de,en,ru}.json`) contain the full approved copy, including the three feature claims, the four count states, and all confirmation wording.
- **End-to-end tests** (`tests/`) exercise the real app shell, account auth, the contents page, the language switcher, and the sharing permissions — including that a buyer cannot add, delete, rename, re-share or delete, and that an owner cannot clear somebody else's mark.
- **Assets:** favicon set, maskable icon, apple-touch icon, three SVG flags (de/en/ru), a loading spinner SVG.

**Absences future work must not fabricate:** no testimonials, no customer logos, no usage metrics, no pricing, no download or install counts, no press. There is no published legal entity. The privacy policy's "premium model" and the README's "occasions and deadlines" are not evidence of shipped capability.

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
