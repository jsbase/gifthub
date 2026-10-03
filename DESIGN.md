---
name: wishy
description: A list written on good paper — a buff album board, white label-stock cells, warm near-black ink, and one colour that means "finished".
colors:
  board: "#E3DACA"
  sheet: "#FDFCF8"
  cell: "#FDFCF8"
  collected: "#190F0A"
  ink: "#1E1410"
  caption: "#5B5049"
  rule: "#807260"
  done: "#18773F"
  destructive: "#B32D18"
  register: "#0B7EA3"
typography:
  display:
    fontFamily: "Golos Text, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  name:
    fontFamily: "Source Serif 4, ui-serif, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  sheet-head:
    fontFamily: "PT Sans Narrow, Golos Text, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.14em"
    textTransform: "uppercase"
  title:
    fontFamily: "PT Sans Narrow, Golos Text, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    letterSpacing: "0.055em"
    textTransform: "uppercase"
    lineHeight: 1.35
  body:
    fontFamily: "Golos Text, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  meta:
    fontFamily: "Golos Text, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.5
rounded:
  control: "3px"
  sheet: "6px"
  cell: "0px"
  rule: "1px"
spacing:
  unit: "4px"
  field-gap: "6px"
  control-gap: "16px"
  page-gutter: "16px"
  band-padding: "32px"
  measure-body: "44ch"
  measure-legal: "68ch"
components:
  button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px {colors.rule}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px {colors.rule}"
    rounded: "{rounded.control}"
    height: "44px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    border: "1px {colors.rule}"
    rounded: "{rounded.sheet}"
    padding: "24px"
    width: "704px"
    shadow: "0 22px 60px -16px rgb(0 0 0 / 0.34)"
  cell:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.ink}"
    border: "1px {colors.rule}"
    rounded: "{rounded.cell}"
  cell-collected:
    backgroundColor: "{colors.collected}"
    textColor: "{colors.sheet}"
    border: "1px {colors.rule}"
    rounded: "{rounded.cell}"
  progress:
    backgroundColor: "{colors.ink} at 13%"
    fillColor: "{member-ink}"
    height: "3px"
    width: "56px"
---

# Design System: wishy

## Overview

**A list written on good paper.**

wishy is not a dashboard. It is a family album: one sheet per person, and on the
sheet a grid of cells, one per gift idea. The page is buff album board. The cells
are white label stock mounted on it. Everything written is warm near-black ink,
and the only thing on the page that is a colour is a person's own ink — six of
them, one per member, drawn from a tray like the pens beside a collector's desk.

The one moment the product exists for is a gift idea being bought. It is marked
by **inverting the cell** and by a rule in that member's ink filling to show how
much of their sheet is dealt with. Permanent, visible to everyone in the group,
the reason nobody buys the same present twice.

**Key Characteristics:**
- One warm colour that means something rather than someone: green, and only for a sheet with nothing left.
- Cut, not moulded: 3px on controls, 6px on a floating sheet, and nothing at all on a cell or a rule.
- One printed hairline, one weight, doing structural work rather than decorative work.
- Two typefaces divided by meaning, plus a narrow printed-label face for the chrome.
- One shadow in the whole app, on the one thing that genuinely floats.
- Two authored moments: the cell settles when you buy something; the count flashes when it changes.

## Colors

| Token | Light | Role |
|---|---|---|
| `--board` | `40 26% 89%` | the album. The page ground. |
| `--sheet` | `45 16% 99%` | label stock mounted on the board. A dialog, the contents page. |
| `--cell` | `45 16% 99%` | one plate on the sheet. Equal to the sheet in light — the **rule** draws the boundary, not a tone difference. |
| `--collected` | `25 30% 9%` | the stamp's ink. The deepest value on the page in light. |
| `--ink` | `25 22% 11%` | printing ink. Body, headings, primary buttons. |
| `--caption` | `28 11% 40%` | receded ink. Notes, counts, URLs, legal copy. |
| `--rule` | `34 14% 44%` | the printed rule. **Structural, not decorative** — 4.59:1 on the sheet, above the 3:1 that a boundary needs. |
| `--done` | `152 54% 28%` | nothing left. See below. |
| `--destructive` | `6 68% 42%` | red pencil. A button fill and nothing else. |
| `--register` | `195 84% 34%` | registration cyan. Focus only. |

Dark mode is not a desaturated light mode: the board drops to a **warm** near-black
(`28 15% 7%`), the saturation stays, the sheet lifts to `30 13% 14%` and the cell
lifts again to `32 13% 20%`.

### The three rules that govern colour

**A token's meaning is theme-relative in luminance, not in identity.** This is the
rule this system learned the hard way, twice. A scrim built as `bg-ink/55` is a
dark veil in light and a **light** veil in dark, which turns the page behind a
dialog into grey static — hence `--scrim`, declared per theme. A collected cell
built as "the other ground" is near-black in light and near-white in dark, so in
dark it became the *brightest* thing on the sheet — hence `--collected`, declared
per theme rather than swapped. Any use of a colour as "the dark one" needs its own
token or it will be inverted in one theme.

**Green means finished, and nothing else.** It is the only semantic colour here:
every other hue is an identity, one of the six member inks. It appears in exactly
one place — replacing the numeral on a sheet with nothing left — because "zero
left" is a conclusion rather than a quantity. It is deliberately *not* one of the
six: a member whose ink hashed to verdigris would collide with it.

**The ink tray never fills a region.** A member's ink appears in three places, all
at the same weight: the progress rule on their row, the mark in their sheet's
margin, and the name rule. Six members on one sheet therefore read as one printed
page with six annotations, not as six colours. It is stable per member by an FNV-1a
hash of their id, because an ink that changed on reload would read as a different
person.

## Typography

**Three faces, three jobs, all three carrying Latin *and* Cyrillic.** This product
routes de/en/ru from one component tree, so a Latin-only face is a bug for half the
audience, not a degradation.

- **Golos Text** — a Cyrillic-first grotesque. Body, controls, labels. It was drawn
  for Cyrillic, so this product's longest strings are its native case.
- **Source Serif 4** — the specimen label, reserved for **a name**: the wordmark, a
  list, a person. This is the one typographic commitment carried over from the
  previous world, and it is better motivated here — a museum label is exactly where
  a serif belongs. (A *group* was in that list once; there are no groups.)
- **PT Sans Narrow** — the printed chrome. Section heads, cell titles, the numerals.
  Confined to 11–12px, where a condensed face reads as stamped type rather than as
  a third body font.

Sizes: body and controls `0.9375rem`/1.625, notes and counts `0.8125rem`, section
heads `0.6875rem` tracked `0.14em` uppercase, cell titles `0.9375rem` tracked
`0.055em` uppercase, names `1.125rem`/600 serif. Measures are 44ch in the app and
68ch for legal prose, both capped against the warm ground rather than against white.

**Forms carry visible labels.** A placeholder vanishes the moment the field is
filled and a screen reader meets it only once; that was a known weakness in the
previous world and it is fixed — every field has a printed label above it.

## Layout

Structure comes from **tone and hairline**, never from a shadow or a rounded box.
There are no cards in this product. The ground is the board; the contents page and
the dialogs are label stock laid on it with a 1px rule.

Every page is a full-height flex column: header, `flex-1` main, footer. On the
dashboard the main region is the board, and the contents list is a **mounted sheet**
— label stock with a rule, hugging its content — so the board reads as the desk
around it. An album page with empty board below its contents is a page whose
contents are short; a page whose contents are mounted is a composed page.

Spacing is a 4px unit and the scale is deliberately small: 6 / 16 / 24 / 32 / 48 / 64.
Header height is a token (`--header-height`) because the mobile dialog is positioned
from it.

### The landing page is a spread, and it is the only asymmetric layout here

The dashboard and the sheets are **Operate**: one centred column, everything on one
axis, because a person looking for a name is scanning, not reading. The landing page
is **Persuade** and is laid out the other way on purpose, on a single `7fr / 5fr`
grid that both of its rows share:

- the claim fills the wide column, set at `clamp(1.75rem, 3.4vw, 2.75rem)` on `1.08`
  with the grid column itself as its measure — no `max-w`, because a cap measured
  identical to the column at 1440, 1024 and 390 and bound nothing;
- the specimen plate is tipped into the narrow column and **dropped 6rem**, so its
  top rule lands inside the claim's block rather than above it;
- below, the three mechanisms run down the wide column, and the narrow column is left
  as bare board.

The page carries **three measures** rather than one: the claim's column for the thing
being said, the plate's own width for the thing being shown, and a `52ch` standfirst
for the sentence that ties them together. The claim's leading is written
*after* the size in the same `cn()` call on purpose — tailwind-merge lets a
font-size class eat a preceding `leading-*`, and in the natural reading order the
claim silently fell back to the `1.5` Tailwind's preflight sets on `html`, which is
what a 44px paragraph inherits with no `leading-*` of its own, and it read as body
copy rather than as a statement. `text-balance` does the real work of evening the rag
across whatever the column turns out to be.

The specimen plate and the index are the two blocks this page is built around, and
**neither carries a heading above it**. That is the point rather than an omission: a
printed head over each would say the two are sections of one kind, and only one of them
is. One is a specimen of the contents page; the other is this page's argument.

The index carries the heading each of its own entries already had — `FeatureCard`
emits an `<h2>` per entry, so this page contributes three, and all three are
deliberate. The plate contributes none, because its only title is the `yourLists`
label, which belongs to the illustration rather than to the document. The page's
`<h1>` is the wordmark in the header and the hero's sentence is a `<p>`: a question,
answered by the standfirst rather than headed by anything of its own. A reader who
navigates by heading therefore reaches the three mechanisms and sees the plate for
the evidence it is, which is the argument this page is making.

The index is the only block in its row. The distance to the hero is that wrapper's
own `mt-16 lg:mt-28`, while the column around the block still carries one `gap-y-12`.
That is why the margin is a `gap-y-*` and not an `mt-*` on each block: a storyboard and
a roles block have both been dropped out of this column, and neither left a margin
behind it.

The eye travels claim → plate → mechanisms, a diagonal, instead of straight down a
centre line. What this replaced was the category default: a hero rectangle, a three-up
feature row, and a second rectangle of exactly the same size, all centred on one axis.
**Two rules keep it that way.** No centred feature row, and no second full-width sheet:
there is one plate on this page and it is the only rectangle the hero draws.

Where the columns exist, that means no plate is laid across the full measure — the one
plate on this page sits in the narrow one from `lg`. **Below `lg` the grid is a single
column and the plate does span it.** That is a stacked phone layout rather than a
second full-width sheet, and the rule is about the spread, not about every width: what
it forbids is a plate that reaches the page's edges *beside* another mass, which is
what turned two plates into a category default.

There is **one** plate on this page and every row on it is one measure wide. The three
states it carries are a sequence rather than a set of alternatives to choose between,
and rows at three widths would rank them. The arc runs down the rows; the anatomy, and
the two shapes this plate was rejected in, are under The specimen plate.

The landing page also **drops the dashboard's `max-w-5xl` and its own horizontal
padding**, because the `container` utility already supplies the page's padding and
that column was padding the padding — it put the content 72px right of the header
wordmark and of the footer's copyright, on the same screen. Content here starts on
the header's left edge and ends on its right.

The dashboard keeps its `max-w-5xl`: a mounted sheet is *meant* to sit inset from
the desk on all four sides, and from `sm` up that inset is the design rather than an
accident.

**Below `sm` the dashboard sheet is not inset, and that is the same rule the
dialog already follows.** `ui/dialog.tsx` states it: below `sm` a sheet "becomes
the whole page below the header, squared at the top: a sheet pulled out of an
album, not a card floating on one." The dashboard's member sheet was the one surface
that did not obey it — inset 32px on a phone while the gift sheet opening on top of
it ran edge to edge, 32px apart, both on screen at once. It now pulls back over the
`container`'s 1rem (`-mx-4`, reset at `sm`) so its border lands on the viewport
edge, and its crop marks come to rest 12px from it: registration marks near the
paper edge, which is what they are for. Content indents by the same 16px the dialog
indents (`px-4`), so both sheets line up. **Do not reintroduce a horizontal inset
on the dashboard below `sm`, and do not reintroduce the column's own `px-4` at any
width** — that padding is what put the two sheets 32px apart.

### Below `sm`, the standfirst moves under the two buttons

On a phone the reading order is **claim → rule → the two ways in → the sentence that
answers the claim**. From `sm` up it is claim → rule → standfirst → buttons, which is
where a standfirst belongs.

This is a structural adaptation, not a squeeze. The actions used to sit under that
sentence, so how far down the page they landed was a function of how long the
sentence was: four lines of German on a 360px phone, and the second button finished
**below the fold** on 320×568 and 360×640 — where most small Androids are. Below
`sm` the standfirst is now the *last* thing in the column, so what stands above it is
the claim, the entry rule and the two ways in — and that block's height is a function
of the claim's own line count. The two ways in are the fixed part of it, and they are
fixed rather than content-driven on purpose: `buttonVariants` gives every button
`whitespace-nowrap` and `size='lg'` gives these two `h-12`, so a label cannot wrap and
a longer translation cannot make either button taller. What is left is the claim, and
no translator can move those controls by rewriting the sentence underneath them —
which is the whole property the reorder buys.

How much room that leaves against the fold is a measurement rather than a derivation,
and it is taken below rather than argued here.

**The block is shorter than the last time this was checked, and that follows from the
copy rather than from a browser.** The claim is 32 characters of German where it was
98, and the standfirst is 50 where it was 129. A shorter claim cannot break into more
lines and a shorter standfirst cannot take more of them, so the column is shorter at
both ends of it. **The character counts no longer argue the reorder, in either
direction.** They used to: the claim fell while the standfirst rose, which left the
property resting on the claim alone. Both have since fallen, and the property stands on
the structure instead — the claim, the entry rule and the two fixed-height ways in form
a block whose height is the claim's own line count, and the buttons cannot wrap or
grow. A claim that grows back towards a sentence is what would break it, and at that
point the argument has to be the measurement below rather than a count of characters.

> **Measured in Chromium, not estimated.** The second button's bottom edge clears a
> realistic 85% fold (the viewport minus a phone's browser chrome and safe area) by
> **205px** at 320×568, **266px** at 360×640, **289px** at 375×667 and **439px** at
> 390×844, in de, ru and en alike. At rest the buttons end at 278px in de and ru, and
> at 248px in en from 360px up, where the claim fits on one line rather than two.
>
> The figures this block replaced — 54px, 115px, 168px and 318px — were measured
> against a 98-character claim and a 129-character standfirst. The claim is now a
> single question and the standfirst one sentence, and the clearance is four times
> what it was at the tightest width. That margin is the point of the reorder, not
> an accident of it: the block that has to clear the fold is the claim's line count
> and nothing else, and a question is short by construction.

**The 44px floor is not a preference.** This is used one-handed on a phone by
someone in a hurry. Both a control's width and its height are floors; the tick and
the delete button are `min-h-11` and stretch, so they are 44px on a one-line row and
full height on a two-line one. A margin column that does not fill its cell leaves a
gap that is invisible until you hover it.

## Elevation & Depth

Exactly one shadow exists and it belongs to a dialog:

```
0 22px 60px -16px rgb(0 0 0 / 0.34)
```

A long soft falloff, not a generic card shadow, because a sheet has to separate from
its scrim while the app behind it stays legible. Nothing else floats, so nothing else
has one.

**Focus is one mechanism for the whole app**, defined once in `@layer base` for
every focusable element, so a new control cannot be added without inheriting a
visible keyboard focus. It is **two tones by construction**: a 2px gap in the local
ground, then a 2px registration-cyan ring. No single flat colour clears 3:1 against
both a buff board and an ink-filled button, and WCAG 2.4.11 accepts a two-colour
indicator when one tone clears — and it is the ring that clears, at 7.16:1 on the dark board,
6.57:1 against its own gap, 3.65:1 on the light board and 4.52:1 against its own gap. The gap is
not what clears; it sits at 1.09:1 and 1.24:1 against the grounds, because its job is to be the
ground the ring is cut out against, not to be seen.
Both tones are `box-shadow`, because `outline-color` falls back to
`currentColor` and would put a ring the same colour as the text on a destructive
button: no indicator at all. A transparent `outline` stays for forced-colors mode,
where box-shadow is dropped.

## Shapes

3px on controls, 6px on a floating sheet, **0 on every cell and every rule.** Album
and label stock are trimmed with a blade. A cell is a printed rectangle, not a
rounded box, and rounding its corners would imply an object where there is an entry.

## Motion

Two authored moments, both short:

- **`cancel-settle`** (260ms) — the cell drops 2px and takes a press when the state
  changes. Gated on `changedId`, so opening a sheet for someone with five collected
  ideas replays nothing.
- **`count-flash`** (520ms) — the numeral in the sheet's header. The only way the app
  reports a change outside the cell itself, because on a phone the header is the one
  thing that stays on screen while you scroll.

Everything else is a 150–200ms colour transition. `prefers-reduced-motion` collapses
all of it, and the one exception is the loading spinner, selected by the class that
animates it rather than by a test id: a stopped spinner is a broken affordance, not a
decorative one.

**Hover is gated on a real pointer**, not on Tailwind's `hover:` — which is
`(hover: hover)` alone, and can latch after a tap on a touch device, leaving a
control in a half-active state with no pointer near it. This needs
`[@media(hover:hover)_and_(pointer:fine)]:`, whose underscores are load-bearing:
written bare, Tailwind emits `@media (hover:hover)and(pointer:fine)`, which no CSS
parser accepts and which fails the entire build.

## Components

### The cell — the gift row

A plate of label stock with a printed rule, three regions, and the product's most
important control.

- **The mark** is in the left margin and is always the **same glyph**: a shopping
  cart. State is carried by **colour** — receded for open, the member's ink for
  bought — and hover shows the **action**, a plus cart when open and a minus cart
  when bought. A mark that swaps its own shape on hover cannot be read at rest, and
  the resting state is the one the group sees all day.
- **The title** is the specimen's name: the printed-label face, uppercase, tracked.
  On a label, the name of the thing is the loudest thing in the cell.
- **The note** is caption ink at 13px. **The URL** is quiet printed reference with an
  external-link mark and a real ellipsis — and deliberately *not* a second link,
  because the whole cell already navigates.
- **The margin columns fill the cell.** `min-h-11` plus stretch, flush left and
  right, so the rule and the hover wash both run the full height.

**The collected state inverts the cell.** In light it goes to ink; in dark it goes
*below* the board, because in both themes receding must mean "further from the
light than its neighbours". 17.5:1 against the sheet. The state must stay readable
in greyscale, so it never rests on colour alone: the inversion, the ink, and
`aria-pressed` all carry it.

### The sheet — a person's page

The gift list is divided into **open** and **collected** sections. That split is the
product's core question — what is still needed versus what is already handled — and
a single undifferentiated list cannot answer either. Open cells sit on white;
collected cells are inverted, so the eye lands on what still needs a present
without being told to.

The sheet **hugs its content** up to a max height. It used to stand open at a fixed
85vh, and the void was not the height at all: the primitive anchored the sheet with
*both* `xs:top` and `xs:bottom-0`, and a fixed box with a definite top and a definite
bottom resolves `height: auto` to the gap between them. The primitive no longer
anchors both edges, so no caller can be defeated by it again.

An **empty sheet is a blank page waiting to be written on**, not a dialog that
failed to load: the same section head, the same printed count at `00`, and one
dashed plate at full content width. Dashed because a solid rule means "there is a
cell" and a dashed one means "there is room for one" — which is the same language the
contents page uses for a member with no ideas.

**The blank plate is the add control.** It is a `<button>` spanning the full width of
a cell, not a paragraph with a quiet ghost row pinned to the foot of the sheet
underneath it. Two reasons, and both were defects: on an empty sheet the only thing
a person can do was the quietest object on it (11px tracked caption below a rule), and
the invitation and the control that carried it out were two separate things with a
rule between them. A dashed plate means there is room for a cell, and the only thing
you can do with room for a cell is write in it. The foot row now renders only once
the sheet has something on it, so there is never a second control doing the same job.
The plate carries the field's own name in the label face, the invitation in ink, and
one line saying what actually goes in ("a name is enough; a note and a link are
optional") — which is the sentence that turns a blank cell from a wall into one
field.

### The contents page

The album's index: one mounted sheet, one row per member, name in Source Serif 4 at
20px with the member's own ink carrying a **progress rule** — filled to the share of
collected ideas — and the **number of still-open ideas** in printed numerals at the
right.

The count used to be one miniature cell per idea. That does not scale: a member with
a hundred ideas produced a hundred cells, so it was capped and the cap printed a
`+N` that only admitted the figure did not fit. Number and rule both scale.

**When nothing is left, the numeral is replaced by a green check** and the rule turns
green.

**Removal mode costs the list no vertical space.** The row declares
`grid-cols-[1fr_auto]` — or `grid-cols-[1fr_auto_auto]` while removal mode is on — and
the third column is declared up front. It used to be an implicit third child in a
two-column grid, so the remove control did not join the row: it wrapped onto a
second, CSS-sized row, and every member grew from 112px to about 190px with the
control tucked under its own name and nothing on the baseline of the rule above it.
Mode is a change of what the right-hand side of the row *is*, never a change of the
row's height: measured, the row is 112px in both modes at 390px and 1440px, and the
name, the figure and the remove control all sit on the same centre line. The toggle
carries `aria-pressed`, because the mode's only other trace is a control appearing
at each row, which is announced at the row and not at the control that caused it.

### The specimen plate — the landing page's quotation of the contents page

The plate on the landing page is the contents page **reproduced at a different
size**: tipped into the narrow column of the spread. What makes it the same product
is material and anatomy, not width — the same stock, the same printed rule, the same
crop marks, the same ruled head, the same list name in Source Serif 4, the same
member ink on the progress rule, the same printed numeral. The anatomy is imported
rather than described, so it cannot drift from what the app shows, and `SheetProgress`
is the authority for the figure itself. Every row carries the same count words behind
the number for anyone who cannot see it.

**One plate, three rows, and the arc runs down the rows rather than across three of
them.** Both of those shapes were rendered, looked at and rejected, and both rejections
are why this plate has this shape. It was three plates once — the same list three times
over, its open count falling until the figure gave way to a check — and three plates
carrying the same head, the same list name and the same single row read as repetition
rather than as a story; the plate in the hero's narrow column plus the pair below it
broke one asymmetric spread into three scattered rectangles, and the plate holding the
check read as a different list rather than as a later state of this one. It was then
one plate carrying one row, and one row is a fragment: a name, a rule and a numeral say
nothing about a product whose argument is the state of a list over time. **Three rows
carry that argument in one glance** — a list nobody has bought from yet, one nearly
done, one finished — and because they are rows on one sheet they are one measure, so a
finished list can never be the smallest thing on the plate. That is also why the rows
are **named for occasions** rather than for people: names like "Ben and Mia" were
tried on this page and asserted a cast it had never set up, and an occasion needs no
introduction.

Three things were taken away from it, and each of them is a rule rather than a
preference:

- **There is no plate title.** It used to name somebody *else's* lists — "Annas
  Listen" — which made the plate a specimen of a character who is not on this page.
  The plate has no header, so it prints the contents page's own section head instead,
  `yourLists`: the same statement about whose lists these are, made about the reader
  and naming nobody. A title is not restored by moving it above the rows.
- **That head is a label, not a heading.** What the plate prints there is a quotation
  of the contents page's own section line, and this page has no section for it to
  open, so an `<h2>` would claim a document section where there is a specimen — an
  outline defect on a page whose whole argument is hierarchy. The real contents page
  keeps its `<h2>`, where it heads a real section of a real page; the specimen prints
  the label it is, in the same `label-print` classes, so the two are optically
  identical and a sighted reader cannot tell the difference.
- **One ink for the plate, not one per row.** The ink is seeded from a module constant
  in `landing-preview.tsx` rather than from a dictionary key, because a key would be
  translatable and the same page would print a different ink in German than in Russian
  for what is one and the same person. The rows are the reader's own lists and they sit
  on the owner's sheet, so they take the owner's ink: a second colour here would say
  two people, which is the confusion this page exists to end.

**There is no caption under the plate**, and there was one for most of this page's
life. A caption has to earn its place, and the last one did not: it named two people
the reader had never heard of, in order to say who may see the list — a rule the
standfirst and the index already carry. A caption that repeats what the page says
elsewhere is the plate's caption explaining the plate, which is the habit this page was
rewritten to break. The rows speak for themselves.

Do not restore the "whole screen" claim, do not give the plate a title or a heading
again, and do not add a second plate: two plates the width of this one is the layout
this page exists to stop doing, and the arc belongs in the rows of the one plate rather
than across three of them.

### The mechanisms — an index of three, all at the same weight

The three feature claims are **not three cards and not three columns**, and they are
not one claim above two others either. All three render as entries of the same index:
claim in a fixed narrow column, description beside it, a hairline above each. This
once had two registers — one claim set large on the full measure with a short entry
rule above it, the other two as lines of an index beneath — because the bought mark
belongs to the list and to everyone it is shared with, which is the thing a
neighbouring product cannot copy without changing what it is. The typography was
carrying an argument the page now makes in copy, and it carried it badly: a lead set
above the other two reads as a headline of its own rather than as one of three.

**This index once followed a frame of two role headings**, statements of situation
rather than claims, naming which side of the page the reader was standing on. Both are
gone, and the three claims carry what the frame carried: they say what the reader gets,
what stops two people buying the same thing, and what stays secret, which is the whole
of "what do I get out of this" to somebody who has not signed up. A frame around an
index makes five headings under one hero, and an index inside a frame is not an index.

**The claim that nobody buys the same thing twice is now said once, and it is said
here.** It was in the hero as well, and the echo is gone: the hero asks the reader a
question and answers it in the sentence underneath, and a question cannot also be a
claim. The product's central claim is the deepest thing on the page rather than the
first, which is the price of the question and the right trade — a question brings a
visitor in, a product mechanic inside the opening sentence does not.

The reading order is a constant — `ORDER` in `components/feature-cards.tsx` — and not
the order the claims happen to be written in the dictionaries, so the order is a
decision rather than an accident of how the JSON is sorted. It is a reading order and
not a whitelist: a named key the dictionary does not have is skipped rather than
leaving a hole in the index, and a key the list does not name still renders, after
the named ones, in dictionary order.

**Do not reintroduce a lead register.** Removing it also removed the 4rem entry rule
that stood above it and the 3rem stand-off between it and the list, so the index's
first hairline now sits at the top of its own block instead of 3rem down, and the
distance to the section above is the caller's to set. That was a visible rhythm
change, and it is the one thing about this section that is easy to mistake for a
regression.

### Buttons, inputs, dialogs, toasts

- **Buttons:** solid ink for the one action a surface exists to perform; outline for
  secondary; ghost for quiet. Only the ink changes on hover — no lift, no scale, no
  shadow. Every size is 44px or taller.
- **Inputs:** a ruled space printed on the sheet, not a grey box. Transparent ground
  so the stock underneath shows through, a structural rule, 44px.
- **Dialogs:** label stock, 6px, 1px rule, printers' **crop marks in the corners** —
  four elements that cost nothing and are the clearest statement that this is a
  printed page rather than a card. Left-aligned titles, because a centred one has to
  be re-found on every line. Below `sm` a sheet is the full height under the header,
  squared at the top. Destructive confirmations have **no** close control: a
  two-choice prompt with an X is a third, ambiguous exit from a dialog about
  deleting something.
- **Toasts:** positioned bottom-right from 640px and top-centre below it, so a toast
  never covers the primary control on a phone. Two numbers make that true below
  640px, and both are load-bearing rather than decorative. **One toast at a
  time**: a phone is 664px tall and a toast is 54px, so three of them stacked
  reach a quarter of the screen — past the two controls at the head of the
  contents sheet, which made them unreachable for four seconds after any two
  quick mutations. **An offset of 57px**, the running head and its own rule:
  at the default the toast lands on the wordmark and the header controls, and
  under the rule it lands on the sheet's top margin, which is the one band of
  the page holding nothing you can press.

## Do's and Don'ts

**Do**
- Separate things with the rule or with whitespace. Both are cheap; neither claims an
  object exists.
- Use the 4px unit and stay inside the small scale.
- Make touch targets 44px or taller on **both** axes, and let margin columns fill
  their cell.
- Keep the collected state readable in greyscale and without colour.
- Cap reading measures — 44ch in the app, 68ch for legal prose.
- Check long German and Russian strings **first**; at 390px two labels do not fit
  side by side.
- Verify contrast in the theme you changed. A colour that clears 4.5:1 on the board
  can sit at 2.1:1 on a collected cell.
- Read the computed values, not the class names. A `max-w` that measures identical to
  the column it sits in binds nothing at any breakpoint and still reads as a
  decision.

**Don't**
- **Don't put things in cards.** There are none. A repeated item is a row of a list
  with a rule above it and square corners.
- **Don't add a second warm colour**, or use green anywhere but a finished sheet.
- **Don't add a shadow** to anything that is not a dialog.
- **Don't use a colour as "the dark one."** Identity is not luminance; see the rule
  at the top of Colors.
- **Don't swap a mark's glyph on hover.** Hover shows the action, colour shows the
  state.
- **Don't set anything but a name in Source Serif 4.** A serif on a control, a gift
  title, a count or legal copy breaks the division the system rests on.
- **Don't add a second rule weight,** a second focus ring, a gradient, glass, a blur,
  or decorative motion.
- **Don't nest interactive elements inside a link,** or add a second control that
  duplicates one that already performs the action. Both have caused real
  accessibility bugs in this codebase.
- **Don't gate hover on Tailwind's `hover:`** where a touch device can reach it.
- **Don't centre the landing page, and don't give it a second plate.** It is the one
  asymmetric layout in this product; see Layout. One plate, tipped into the narrow
  column, is the only rectangle the landing page draws, and a second full-width plate
  is the layout this page exists to stop doing.
- **Don't put a heading over the plate or over the index.** A specimen and an argument
  are not two sections of one kind, and the printed chrome a head would bring back is
  what the hero abolished. The page's `<h1>` is the wordmark in the header and its three
  `<h2>`s are the mechanisms; the hero's sentence is a `<p>`.
- **Don't reintroduce the two role headings** above the index. The three claims now
  carry what the frame carried, and two headings above an index of three makes five
  headings under one hero rather than one index; see The mechanisms.
- **Don't restore the large lead claim** in the mechanisms index. All three entries
  weigh the same; see The mechanisms.
- **Don't print a field's own name where a dialog should be saying what it is for.**
  The login sheet's description once repeated the identifier field's own label, which
  put "Gruppenname" on screen three times in a row — description, printed label,
  placeholder. Two of those are still there by design; the placeholder is gone.
- **Don't print a permanent hint under a field.** The sentence explaining what a
  nickname *is* lives in the sheet description instead, where it is read once with the
  title: the question is asked once, on the way in, and a line printed for the whole
  interaction answers it again on every later glance, standing between the reader and
  the one control the sheet exists to offer.

## Known debts

- **The landing page's bare board is a decision, and it is load-bearing — but how much
  of it there is has never been measured.** The narrow column is empty from below the
  tipped plate all the way past the mechanisms index. It reads as a desk because the
  plate is clearly tipped in and the claim beside it is clearly set; anything that grows
  into that space, or anything that re-centres the page, removes the reason it reads as
  intentional. A storyboard and a roles block once filled the wide column beside it,
  and both are gone, so the debt is smaller than it was when this was written — which
  is a direction, not a figure, and the number still has to come from a browser.
> **Measured in Chromium at 1440×900.** The narrow column is **443px** wide and the
> plate fills it, starting 233px down and ending at 496px in de and en, 521px in ru
> — the Russian standfirst is one line longer, which is the only thing on this page
> that differs between locales at desktop. The empty column beneath it runs from
> there to the footer. The figures previously recorded here — roughly 440 × 560 —
> were measured when the column beside it held nothing but the mechanisms index.
- **The dark cell frame is weak.** Cell on sheet measures 1.24:1 and the hairline on
  the cell 1.49:1, so the dark grid does rely on that hairline and the hairline is
  near-invisible. The lift is real but subtle. A per-theme separation would fix it
  and has not been done.
- **A list's name has almost no validation while a person's does.** An account display
  name goes through `acceptedDisplayName` and its one regex: letters, combining marks,
  numbers, space, dot, hyphen and either apostrophe, NFC-composed, at least one letter
  required, 1–100 characters, with the no-break space and non-breaking hyphen rewritten
  on the way in. A list name is refused only when it is empty after trimming. The
  asymmetry is real and unresolved, and it is the one place where the system's serif is
  reserved for a name the product has never decided how to accept.
- **Sonner's success icon is the library's**, not the system's.
- **`giftStrikethrough`** is the test id for the buy control. The name predates this
  design and no longer describes what the control does.