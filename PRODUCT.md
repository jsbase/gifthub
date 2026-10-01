# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the member of one family or friend group who is coordinating a gift for someone else in that group. They open the app when an idea occurs to them — often on a phone, in the moment — and again when they need to know what is still unclaimed before buying something.

The app has no per-person account. A `Group` is a name plus a password, and everyone in it signs in with those same two values. A `User` row exists in the schema but represents a **member name** recorded inside the group, not a login identity. So a user is simultaneously the buyer and a listed recipient: the same person writes down ideas for someone else and has their own row that other people write ideas onto.

The German-first default locale, Cyrillic-capable type, and the deliberately large touch targets all point to a real multilingual family audience (de/en/ru), not an English-only demo. Users are not technical; nothing in the product requires an account recovery flow, an email address, or a profile.

**Intended future direction (confirmed, not built):** the same group mechanics are meant to grow toward a consumer product — real accounts, invitations, and eventually the premium model the privacy policy already describes. The current account model is **provisional**, not a durable commitment. Future work should not design as though the shared group password is permanent, and should not paint the group model into a corner that a per-user identity would require dismantling.

## Product Purpose

wishy gives one group a single shared list of gift ideas, so nobody in it buys the same present twice.

The job has two halves that are easy to confuse. One is *coordination*: a shared record of who wants what, and which of those things are already covered. The other is *surprise*: the person being celebrated must not be able to see the list that is about them. The product's copy names the second half as the promise ("The surprise stays a surprise") and the first half as the mechanism, but they are equally load-bearing — a coordination tool that leaks the surprise is worse than useless at a birthday.

Success means: an idea gets written down within seconds of occurring, it stays visible to the group, and once someone buys it the rest of the group finds out. The unit of success is a gift bought exactly once, by someone who knew it was needed.

## Positioning

The mechanism a neighbouring product could not truthfully copy is the **bought flag as a shared, permanent, group-wide mark rather than a personal check-off**. Most wishlist tools let each person tick off what they personally intend to buy. wishy's tick is visible to everyone in the group immediately, which is what makes double-buying structurally impossible rather than a matter of good manners. Two consequences follow and are load-bearing:

- **Bought items recede, not disappear.** A bought idea stays struck through and stays on the list, because the group still needs to see the history of what was covered. Open items carry the visual weight.
- **Empty and complete are different states.** A member with no ideas at all is the one who most needs a present, and a member whose list is fully bought is not. The product refuses to conflate them, and the count language says which is which.

The shared-password group is not a security model; it is a low-friction admission model. That is a legitimate trade for a family app and must be preserved as a trade, not "fixed" reflexively.

## Operating Context

- **Moments of use:** standing in a shop with a half-formed idea, and at a desk or sofa planning a group occasion. The first moment is why inputs are sized for a thumb and the form is three short fields; the second is why the dashboard is a scannable list of names and counts rather than a per-member detail view.
- **The physical object this resembles:** a bound family album, one sheet per person, with ideas written into a grid of cells. The interface follows that: a board, a sheet, a grid, one kind of mark. This is the standing visual metaphor; `DESIGN.md` holds the system.
- **Who writes what:** any member of the group can add an idea to any member's list. The list is not the recipient's property.
- **Ritual:** the mark. Marking an idea bought is the one moment in the product with ceremony attached: the cell inverts, and the row's rule fills further. It is the only place colour changes meaning, and it is a shared, permanent mark rather than a personal tick.
- **Environment:** deployed on Vercel against a Postgres database (Neon in practice). Local development requires the same environment values in both `.env` and `.env.local` because Next.js and the Prisma CLI read different files.

## Capabilities and Constraints

**Built and working:**
- Group registration and login by shared name + password; session JWT; logout.
- Members as names within a group, with add and remove. Removing a member cascades and deletes every gift idea on their list.
- Gift ideas per member: title (required), description (optional), URL (optional), and a purchased flag.
- Marking an idea bought / moving it back; deleting an idea.
- One dashboard listing all members with a per-member count of open ideas.
- Three locales (de default, en, ru) with a language switcher, full dictionaries, and typefaces that carry Latin and Cyrillic.
- Dark mode following the system preference.
- Toast notifications for every mutation outcome.
- Playwright end-to-end coverage for app shell, auth buttons, dashboard, and language switching.

**Confirmed constraints future work must preserve:**
- **No per-person identity exists.** Do not design a flow that assumes a signed-in user *is* a specific member, or that a member can be authenticated. The JWT identifies a group, not a person.
- **The group password is provisional.** It is expected to be replaced by real accounts. Avoid making it load-bearing in ways that are expensive to undo (e.g. baking it into URLs, per-member scopes, or irreversible data assumptions).
- **Deleting a member destroys that member's gift ideas, irreversibly.** This is the highest-stakes action in the app and already has a dedicated confirmation pattern; new destructive actions need the same care.
- **Long German and Russian strings are a first-class layout constraint.** Two labels do not fit side by side at 390px. Any new row of controls must be assumed to break in German before it is checked in English.
- **Typeface loading requires Latin *and* Cyrillic subsets** for both families. A new font without a Cyrillic subset is a bug.

**Unfulfilled claims — treat as off-limits until implemented (confirmed):**
- **Premium / payment model.** The privacy policy describes storing payment methods, transaction data and payment status for a premium membership. Nothing in the codebase does this. Do not surface, imply, or design toward a paid tier.
- **Occasions and deadlines.** The README claims "track special occasions and deadlines". There is no date, occasion or deadline anywhere in the schema. Do not build on this claim as though the data model supports it.
- **Operator details are placeholders.** Privacy policy section 2 contains unfilled `[Operator's Name] [Address] [Email Address] [Phone Number]`. The app is deployed publicly, so this is a known legal gap, not a design detail.

## Brand Commitments

- **Name:** wishy. The mark is a tag glyph beside the wordmark — deliberately not a present, because the subject is a list of things other people are going to wrap and hand over.
- **Wordmark and a group's name are set in a serif; everything else is sans.** When an authenticated user is present, the header shows the group's own name in place of the product name, so the product reads as the group's list rather than as a tool. Preserve that substitution.
- **Voice:** plain, short, and specific. Feature headings are claims with consequences ("Nobody buys it twice"), not adjectives. Confirmations state the actual consequence and what cannot be undone. The three feature sentences describe behaviour, never features of the software.
- **Copy is a product asset:** the dictionaries are the authoritative wording, and a change to a feature heading is a change to the product's claim, not a copy tweak.
- **Interface language follows the route locale** and all three dictionaries are complete. A new string is un-done until it exists in de, en and ru.

## Evidence on Hand

- **Seed data:** `prisma/seed.mjs` creates group `testgroup` / `test123` with three members, so there is something to log into immediately after setup.
- **Landing-page preview copy:** three sample member names (Anna 3, Ben 1, Mia 0) with real count strings drawn from the shipped dictionary — the landing page quotes the actual dashboard, not a mock-up.
- **Dictionary files** (`lib/translations/{de,en,ru}.json`) contain the full approved copy, including the three feature claims, the four count states, and all confirmation wording.
- **End-to-end tests** (`tests/`) exercise the real app shell, auth, dashboard and language switching.
- **Assets:** favicon set, maskable icon, apple-touch icon, three SVG flags (de/en/ru), a loading spinner SVG.

**Absences future work must not fabricate:** no testimonials, no customer logos, no usage metrics, no pricing, no download or install counts, no press. There is no published legal entity. The privacy policy's "premium model" and the README's "occasions and deadlines" are not evidence of shipped capability.

## Product Principles

1. **The surprise is a feature, not a side effect.** Anything that would let a recipient see the list about them is a defect, whatever it costs. Read paths and list boundaries are a product concern, not just a permission concern.
2. **The tick is shared.** An idea's bought state belongs to the group at the moment it is set. Never scope it to one member or make it per-person.
3. **Frictionless admission, no pretended security.** One name and one password get a group in. Do not add a flow that implies stronger identity than exists, and do not treat the provisional password as a permanent constraint in the design.
4. **Empty is not the same as done.** A member with no ideas and a member with nothing left to buy are different situations and the interface must be able to say which.
5. **Write it down in seconds.** The capture path is the product's most-used moment. Nothing about adding an idea should take longer than noticing it.
6. **Say what will happen before it happens.** Deleting is destructive, sometimes silently cascading; confirmations state the consequence and the irreversibility.

## Accessibility & Inclusion

- **Multilingual by construction, not by translation pass.** de/en/ru are equally first-class. German and Russian are longer than English, so layout must be designed against the longest string, and a change that only looks right in English is not done.
- **Cyrillic is a hard requirement for type.** Both typefaces must load a Cyrillic subset; a Latin-only font breaks the product for Russian users.
- **Reduced motion is honoured globally.** All animation and transition collapses to a state change under `prefers-reduced-motion`, with the single exception of the loading spinner, which keeps spinning because a stopped spinner is a broken affordance.
- **One app-wide focus mechanism, two-tone by construction.** Every interactive element inherits a visible keyboard focus, and no single flat colour can meet contrast against both the light page and the red destructive fill — the indicator is a gap tone plus a ring tone. Do not introduce a second focus treatment per component.
- **Real touch-target minimums.** Form controls are 44px and primary dialog actions are 48px, because the product is used one-handed on a phone. This is a floor, not a preference.
- **Forms carry visible printed labels.** Every field has a small tracked label above it, not just a placeholder. A placeholder vanishes the moment the field is filled and a screen reader meets it only once; that was a known weakness of the previous design and it is fixed. Do not regress to placeholder-only.
- **No colour-only state.** A bought gift is distinguished by the inverted cell, the cart in the member's ink, and the rule's fill — three channels, so the state survives a monochrome or colour-vision difference. The green check on a sheet with nothing left is likewise never the only signal.
