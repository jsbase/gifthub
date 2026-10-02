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
  group, a person. This is the one typographic commitment carried over from the
  previous world, and it is better motivated here — a museum label is exactly where
  a serif belongs.
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

- the claim fills the wide column, set large with the grid column itself as its
  measure — no `max-w`, because a cap measured identical to the column at 1440,
  1024 and 390 and bound nothing;
- the specimen plate is tipped into the narrow column and **dropped 6rem**, so its
  top rule lands inside the claim's block rather than above it;
- the mechanisms run down the wide column below, and the narrow column is left as
  bare board.

The eye travels claim → plate → mechanisms, a diagonal, instead of straight down a
centre line. What this replaced was the category default: a hero rectangle, a
three-up feature row, and a second rectangle of exactly the same size, all centred on
one axis. **Do not reintroduce a same-size pair of plates, a centred feature row, or
a second full-width sheet on this page.** One plate, tipped in, beside the claim.

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
explains them**. From `sm` up it is claim → rule → standfirst → buttons, which is
where a standfirst belongs.

This is a structural adaptation, not a squeeze. The actions used to sit under that
sentence, so how far down the page they landed was a function of how long the
sentence was: four lines of German on a 360px phone, and the second button finished
**below the fold** on 320×568 and 360×640 — where most small Androids are. Moving
the explanation below the action makes claim + rule + buttons a block whose height
is the claim's own line count, so the controls clear the fold on the smallest screen
this app supports in every locale, and their position stops depending on prose
length at all. Measured at rest against a realistic 85% fold (the viewport minus a
phone's browser chrome and safe area), the second button's bottom edge is 54px clear
at 320×568, 115px at 360×640, 168px at 375×667 and 318px at 390×844 — and the block
lands on the same y in German and Russian, which is the point.

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

The plate on the landing page is the same contents page **reproduced at a different
size**, tipped into the narrow column of the spread. What makes it the same product
is material and anatomy, not width: the same stock, the same printed rule, the same
crop marks, the same ruled head, the same name in Source Serif 4, the same member ink
on the progress rule, the same printed numeral. It is drawn with `SheetProgress`
imported, not copied, and it carries the same count words behind the figure for
anyone who cannot see it.

Two pieces of catalogue furniture it has and the dashboard sheet does not:

- **A plate title**, a real group's name in the serif. The dashboard puts the group's
  name in the app *header*; the plate has no header, so the line that makes the
  product about one group rather than about software would otherwise be missing.
- **A caption underneath**, on the board, in caption ink. It used to sit above the
  plate and used to claim the plate was "the whole screen", which stopped being true
  the moment the plate stopped being the same size as the dashboard's sheet. A
  caption belongs below the thing it captions.

Do not restore the "whole screen" claim, and do not grow the plate back to full width:
a same-size pair of plates is the layout this page exists to stop doing.

### The mechanisms — a claim and an index

The three feature claims are **not three cards and not three columns**. One of them
is the product's own claim — the bought flag belongs to the group, which is the thing
a neighbouring product cannot copy without changing what it is — and it is set large
on the full measure with a short entry rule above it. The other two are the mechanics
that make it true, and they are set as two lines of a catalogue index beneath: claim
in a fixed narrow column, description beside it, a hairline between entries. The
leading claim is chosen by dictionary **key**, not by position, so the reading order
is a decision rather than an accident of how the JSON happens to be sorted.

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
  never covers the primary control on a phone.

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
- **Don't centre the landing page, and don't give it a second full-width plate.** It
  is the one asymmetric layout in this product; see Layout.
- **Don't print a field's own name where a dialog should be saying what it is for.**
  The login sheet's description used to be `enterGroupName`, which put "Gruppenname"
  on screen three times in a row — description, printed label, placeholder.

## Known debts

- **The landing page's bare board is a decision, and it is load-bearing.** The narrow
  column below the plate is roughly 440 × 560px of empty board at 1440. It reads as
  intentional only because the plate is clearly tipped in and the claim beside it is
  clearly set; anything that grows into that space, or anything that re-centres the
  page, removes the reason the space reads as a desk.
- **The dark cell frame is weak.** Cell on sheet measures 1.24:1 and the hairline on
  the cell 1.49:1, so the dark grid does rely on that hairline and the hairline is
  near-invisible. The lift is real but subtle. A per-theme separation would fix it
  and has not been done.
- **Group registration has no name validation** while member names do, so the
  asymmetry is real and unresolved.
- **Sonner's success icon is the library's**, not the system's.
- **`giftStrikethrough`** is the test id for the buy control. The name predates this
  design and no longer describes what the control does.