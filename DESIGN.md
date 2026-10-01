---
name: wishy
description: A list written on good paper — petrol ink on a cool grey-green sheet, with one warm colour spent on the strike.
colors:
  paper: "#F6F8F7"
  petrol: "#0E3439"
  frost: "#E2E9E7"
  slate: "#4E5F5C"
  hairline: "#C6D2D0"
  marigold: "#E3A126"
  signal: "#AF2418"
  surface: "#F6F8F7"
typography:
  display:
    fontFamily: "Literata, ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.25rem, 7vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  name:
    fontFamily: "Literata, ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  lead:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  prose:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  meta:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "8px"
  control-sm: "6px"
  toast: "10px"
  dialog: "16px"
  square: "0px"
spacing:
  hairline-unit: "4px"
  field-gap: "8px"
  control-gap: "16px"
  control-gap-mobile: "8px"
  page-gutter: "16px"
  page-gutter-lg: "32px"
  block-gap: "64px"
  band-padding-y: "32px"
  band-padding-y-lg: "48px"
  header-height: "56px"
  measure-prose: "68ch"
  measure-body: "46ch"
components:
  button-default:
    backgroundColor: "{colors.petrol}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
    typography: "Onest 500 0.9375rem/1.25"
  button-default-lg:
    backgroundColor: "{colors.petrol}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 24px"
    typography: "Onest 500 1rem/1.5"
  button-default-hover:
    backgroundColor: "{colors.petrol}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.petrol}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.slate}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-destructive:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.petrol}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 12px"
    typography: "Onest 400 0.9375rem/1.5"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.petrol}"
    rounded: "{rounded.dialog}"
    padding: "24px"
    width: "672px"
  menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.petrol}"
    rounded: "{rounded.dialog}"
    padding: "4px"
    width: "160px"
  list-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.petrol}"
    rounded: "0px"
    height: "64px"
  strike-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.hairline}"
    rounded: "5px"
    size: "20px"
---

# Design System: wishy

## Overview

**Creative North Star: "The Good-Paper List"**

wishy is a list written on good paper. The page is Paper: a cool grey-green sheet, warm only by being uncoloured, the way good paper is uncoloured. Everything the reader does is written on that sheet in Petrol, a deep blue-green ink that has been mixed with enough black to read as ink rather than as a hue. There is exactly one warm colour in the entire interface — Marigold — and it is spent entirely on the strike that crosses a gift idea off the list. Its rarity is the whole point: it is the only thing on the screen that is unmistakably an event, and it looks like one because a highlighters' job is to mark something done.

The system is flat. There are no cards, no elevation stacks, no floating panels, no tinted chips, no gradients and no glass. Structure comes from a single hairline colour and from three tones of the same ground stepped in order: the page is Paper, the member list is written on a full-bleed band of Frost, and Surface exists only for the one thing that floats above a scrim. A viewer told to describe a wishy screen should say "a page with a list on it", not "cards on a background" — and if they say the second thing, the screen has drifted.

Depth, when it appears at all, appears only because something genuinely floats: a dialog, a dropdown, a toast. All three carry the same long, soft, low-opacity falloff, and nothing else in the app has a shadow. The aesthetic philosophy is understated on purpose — this is a tool used on a phone, in a hallway, by someone in a hurry, whose data is other people's birthdays. It earns its craft through measure, through the 44px input that a thumb can hit, through the two-tone focus ring that no single flat colour could produce, and through a serif used with such discipline that seeing it anywhere else would be a mistake.

**Key Characteristics:**
- One warm colour, spent on one action: the strike.
- Three grounds, stepped: Paper, Frost, Surface. Nothing else.
- A hairline instead of a border box; a sheet instead of a card.
- Two typefaces divided by meaning: a serif for names, a sans for everything else.
- Flat by default; shadow only where something genuinely floats.
- Exactly one animation worth the name.

### Named Rules

**The One Warm Colour Rule.** Marigold appears on the strike and on the ticked box beside it, and nowhere else — not on a link, a hover, a focus ring, a heading, a chart, an icon. If a new surface appears to need a second accent, it needs less colour, not another colour.

**The Name Serif Rule.** Literata sets names and only names: the wordmark, a group's name, a member's name in a list, a member's name as a dialog title. Every heading that is not a name, every control, every gift title, every count and the whole of the legal copy is Onest. A serif on a non-name is not a style choice, it is a broken rule.

**The List Is Not a Card Rule.** A repeated item in this app is a row of a list — a hairline above, square corners, no shadow, no background, no radius, unless it is a bought row sitting on Frost. Wrapping items in boxes claims they are objects to be compared; they are lines to be read in order.

**The Ink-Wash Rule.** There is no `--secondary` tint. Every hover, selection and highlighted state in the app is one 8% wash of the current ink (`--color-accent`), which is why the same hover works on Paper, on Frost and in dark mode without any surface-specific value.

## Colors

A cool grey-green sheet in three tones, one blue-green ink, one grey-green secondary, one hairline, one warm mark, and one red that is only ever destructive.

### Primary
- **Petrol** (#0E3439): the ink. Body text, primary button fill, section headings, and in dark mode the ink itself (it inverts to #DBE6E4 while the ground drops to a 49%-saturated #0C1E22). Used wherever a control must read as the loudest thing in its group.
- **Paper** (#F6F8F7): the sheet. Page background, and the text colour on Petrol and Signal fills. Also the dropdown and toast surface in light mode.

### Secondary
- **Frost** (#E2E9E7): the band. Exactly one job in the whole app — the full-bleed sheet the member list is written on, and the settled state of a bought gift row. It is bound to that band, which is why there is no `--secondary` component tint: a second use would have put it behind a rounded box.
- **Slate** (#4E5F5C): the receded voice. Descriptions, counts, URLs, footer copy, legal body copy, ghost-button labels. Slate is what text becomes when it is context rather than content.

### Tertiary
- **Marigold** (#E3A126): the strike. Applied as a 1.5px `text-decoration` across a bought gift title, and as the fill of the tick box that bought it. Nowhere else.
- **Signal** (#AF2418): destructive only. The confirm button in a deletion dialog, and a trash icon on hover. Never decorative, never a link, never an error-state background across a whole panel.

### Neutral
- **Hairline** (#C6D2D0): every border in the app — header, footer, list rows, inputs, dialog edge, dropdown edge. One colour, one weight. In dark mode it becomes #274549.
- **Surface** (#F6F8F7 light / #112427 dark): the only tone that exists to hold something above a scrim. Dialogs use it; nothing else may.
- **Focus gap** (#FFFFFF light / #0A171A dark) and **Focus ring** (#3E8B93 light / #3F858D dark): the two tones of the one focus mechanism. See Elevation & Depth.

### Named Rules

**The One Warm Colour Rule.** Marigold appears on the strike and on the ticked box beside it, and nowhere else — not on a link, a hover, a focus ring, a heading, a chart, an icon. If a new surface appears to need a second accent, it needs less colour, not another colour.

**The Rarity Rule.** Accent weight across a screen: Paper dominates, Petrol carries, Slate recedes, Marigold appears once. A screen showing three Marigold elements has stopped being a list on paper and started being a product page.

**The Focus Pair Rule.** Focus is drawn in two tones — a 2px gap in the surface tone, then a 2px mid-teal ring — and both are plain hex, not derived. No single flat colour can clear 3:1 against both a near-white page and a mid-dark red button; two stacked `box-shadow` layers draw the same figure and are not subject to the `outline` colour fallback that made the obvious version render a red ring on a red button.

## Typography

**Display Font:** Literata (with `ui-serif, Georgia, 'Times New Roman', serif`)
**Body Font:** Onest (with `ui-sans-serif, system-ui, sans-serif`)
**Label/Mono Font:** none. There is no monospace in this system; a number is set in Onest.

**Character:** The pairing is a division of labour, not a contrast for its own sake. Literata is a reading serif with real presence at 18–56px and it is rationed to the one thing it is good at — a person's name, which is the emotional centre of every screen here. Onest is a neutral, slightly rounded grotesque that stays legible in German and Russian at 13px and never competes for attention. Both ship Latin and Cyrillic, which the de/en/ru route tree requires, and both are loaded with `display: swap`.

### Hierarchy
- **Display** (600, `clamp(2.25rem, 7vw, 3.5rem)`, line-height 1, tracking -0.02em): the wordmark on the landing page, and only there. One per product, above the fold.
- **Headline** (600, `clamp(1.75rem, 4vw, 2.25rem)`, line-height 1.25, tracking -0.01em): the page title on legal pages. Never used inside the app.
- **Section** (600, `1.875rem`, line-height 1, tracking -0.01em): the member-list heading on the dashboard. It stays in the sans because it is a label, not a name.
- **Title** (600, `1.125rem`, line-height 1.375): dialog titles and feature-card headings.
- **Body** (400, `0.9375rem`, line-height 1.625): the app's default reading size — gift titles, descriptions, empty states, form fields. Descriptions cap at 40ch, marketing lead at 46ch.
- **Prose** (400, `1rem`, line-height 1.7): legal body copy only, capped at 68ch, in Slate, with `text-wrap: pretty`.

### Named Rules

**The Name Serif Rule.** Literata sets names and only names: the wordmark, a group's name, a member's name in a list, a member's name as a dialog title. Every heading that is not a name, every control, every gift title, every count and the whole of the legal copy is Onest. A serif on a non-name is not a style choice, it is a broken rule.

**The 15px Body Rule.** Body and control text is `0.9375rem` (15px), not 14px and not 16px. It is the size at which Onest's Cyrillic stays open without going soft. Meta text drops one step to `0.8125rem` (13px) and nothing goes below it.

**The Label Is a Placeholder Rule.** Form labels in this app are `sr-only`; the placeholder carries the instruction. Anything that must be readable once the field is filled needs a visible label instead — do not rely on a placeholder as the only label.

## Layout

The layout backbone is a hand-written `container` utility, reimplemented because Tailwind v4 dropped the v3 `container` configuration. It is `width: 100%` with `margin-inline: auto` and a padding ladder — 16px, then 32px from 40rem, then 64px from 64rem, 80px from 80rem, 96px from 96rem — paired with max-widths of 40/48/64/80/96rem at the same breakpoints. The rule is structural: `container` is always the outer element and the narrow content column (`max-w-2xl mx-auto`) always nests inside it, so no max-width utility ever fights the ladder on the same element.

Every page is a full-height flex column: header, `flex-1` main, footer, so the footer sits at the foot of the page rather than floating behind a field of background. On the dashboard the main region is `flex-1 bg-band`, which is what gives the member list its full-bleed band and its remaining height.

Spacing is a 4px hairline unit and the scale is deliberately small: 8px between stacked fields, 16px between controls, 24px inside a desktop dialog, 32/48px vertical padding inside the band. Vertical section gaps are large and few — 64px from the auth buttons to the feature columns, 48px from the features to the preview — because the page is short and the whitespace is doing the separating. Horizontal gaps inside a row are tight: 8px, or 12px when an icon sits beside text.

Header height is a token (56px) rather than a number typed at the call site, because the mobile dialog sheet is positioned from it: below `sm` a dialog becomes a full-height sheet squared off at the top, sitting directly under the header and offset by 1px so the header's hairline stays visible.

Responsive changes are structural rather than cosmetic. Below `sm` (640px) the two auth buttons stack full-width, the member-list actions stack into a one-column grid (at 390px two German or Russian labels do not fit side by side), the dialog footer reverses so the primary action is nearest the thumb, and form gaps tighten from 16px to 8px. Breakpoints in use are `xs` (max-width 639px, a custom variant), `sm` (640px), `min-[26rem]` (416px) for the member-list action grid, `md` (768px), `lg` (1024px).

## Elevation & Depth

This system does not use shadows as a default. Surfaces are flat at rest; depth comes from tonal stepping — Paper for the page, Frost for the band, Surface for the one thing that floats — plus a single hairline colour that is the same everywhere. Exactly three shadows exist in the codebase and all three belong to things that genuinely float: a dialog, a dropdown menu, and a toast. Nothing else has one, and adding a shadow to a static element is the fastest way to break the system.

### Shadow Vocabulary
- **Floating panel** (`box-shadow: 0 18px 50px -12px rgb(0 0 0 / 0.28)`): dialogs only. A long, soft falloff rather than the generic card shadow, because a dialog has to separate from its scrim while the app behind it is still legible.
- **Floating menu** (`box-shadow: 0 12px 30px -10px rgb(0 0 0 / 0.24)`): dropdown menus and toasts, which are lighter and smaller than a dialog.
- **Scrim** (`bg-foreground/45` + `backdrop-blur-[2px]`): the dialog overlay. Slightly heavier on the loading spinner (`bg-background/85`, `backdrop-blur-sm`), because it blocks the page rather than inviting a decision.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow is not decoration; it is a claim that something is above the page. If the element is not modal, it gets a hairline or a tone change instead.

**The Two-Tone Focus Rule.** Focus is one mechanism for the whole app, defined once in `@layer base` for `a, button, input, textarea, select, summary, [tabindex]`, so no interactive element can be added without inheriting a visible keyboard focus. It is drawn as `box-shadow: 0 0 0 2px var(--focus-gap), 0 0 0 4px var(--focus-ring)`, with a transparent `outline: 2px solid transparent` left in place because `box-shadow` is dropped in forced-colors mode. Never restyle focus per component; there is no second ring to keep in sync.

## Shapes

The form language is restrained and deliberate about what gets rounded. Controls are gently curved at 8px, derived from a 10px base radius; a dialog is more curved at 16px because it floats; a toast sits at 10px; small icon buttons round to a full circle only where they hold a round image (the language switcher flag). Everything that is a list — every member row, every gift row, the full-bleed band, the landing preview frame — is square. A list is not a box, and rounding its corners would imply an object where there is a sequence.

Borders are a single hairline in one colour everywhere: no double borders, no border on one side only except as a separator between rows, no outlines that differ from the standard hairline. Controls carry a 1px `border-input`; the gift tick box is the one deliberate exception at 1.5px, because it has to hold a 3px-weight checkmark without looking flimsy at 20px.

Iconography is Lucide at 16px (h-4 w-4) inside controls and 20px for the gift tick, with a reduced stroke weight (1.75) on the logo's tag glyph so it sits beside a serif wordmark without competing. Clipping is square by default; `rounded-full` appears only on the flag button.

## Components

### Buttons
- **Shape:** Gently curved (8px, `rounded-md`), 6px on the small variant.
- **Primary:** Petrol fill (`bg-primary`), Paper text, 15px/500 Onest, 40px tall with 16px side padding; 48px tall with 24px side padding on `lg`, which is what the landing page's two auth buttons use at a minimum width of 176px.
- **Hover / Focus:** `hover:bg-primary/90` and nothing else — no lift, no scale, no shadow. Colour-only transitions at 150ms across `background-color, border-color, color, opacity`. Focus comes from the base rule, never from the variant.
- **Outline:** Transparent with a 1px Hairline border and Petrol text; hover fills with the 8% ink wash. This is the secondary action on the landing page and the destructive-list toggle on the dashboard.
- **Ghost:** Transparent with Slate text, filling to the 8% ink wash on hover and returning to Petrol. Used for the logout, the language switcher and the per-row trash icons.
- **Destructive:** Signal fill with Paper text. Reserved for the confirm button in a deletion dialog.
- **Disabled:** `opacity-50`, `pointer-events-none`.
- **No `secondary` variant exists.** Frost is bound to the one full-bleed band; a second tint would have put it behind rounded boxes.

### Cards / Containers
- **There are no cards in this app.** This is a documented invariant, not an omission.
- **The band:** the member list and the landing preview frame sit on a full-bleed Frost sheet, square corners, 1px Hairline border where the preview is quoted rather than rendered, 32/48px vertical padding. On the dashboard it takes the remaining page height.
- **Feature columns:** no box, no border, no shadow, no background. Three sentences about how the group works, separated by a 40px column gap alone — putting them in cards would claim they are objects to compare.

### Inputs / Fields
- **Style:** 44px tall (`h-11`, not shadcn's 40px, because these forms are filled in on a phone in a hallway by someone in a hurry), full width, 8px radius, transparent background, 1px Hairline border, 12px side padding, 15px Onest. Placeholder in Slate.
- **Focus:** the app-wide two-tone ring, gap then ring. The border does not change colour.
- **Error / Disabled:** the app reports failures through toasts, not inline field states; disabled fields are `opacity-50` with `not-allowed` cursor.
- **Textarea:** same treatment, `min-h-24`, `py-2.5`, vertically resizable.

### Navigation
- **Style:** a 56px-tall bar with a single Hairline bottom border, the wordmark at the left (`Tag` glyph at 1.75 stroke + the group or product name in Literata, falling back to "wishy"), and a right cluster of the language switcher and, when authenticated, the ghost logout button. There is no active/hover state on the wordmark beyond the base focus ring, because the header never moves: the logo link is either home or dashboard and the route decides which.
- **Mobile:** unchanged in structure; the right cluster gaps tighten from 12px to 4px and the logout keeps icon-plus-label at small size.

### The Gift Row (signature)
One row of a list, not a card: no border box, no shadow, no radius, a Hairline above and writing on the page. Three siblings — a 20px tick box, the link (or a plain div when there is no URL), and a 36px ghost trash button — never nested, because interactive content inside an `<a>` is invalid and makes the link's accessible name recurse.

The tick is the entire toggle: a 1.5px Hairline square, `rounded-[5px]`, that fills Marigold with a Surface-coloured 3px-weight checkmark when bought and returns to Hairline on hover. It carries no text label — a square beside a line of a list is understood without one, and the stroke it draws is the feedback.

A bought row is the app's only state change: the title takes a 1.5px Marigold `line-through` with `text-decoration-color` animated from transparent, the text drops to Slate, and the row's background settles to Frost. Three deliberate choices live here. The strike is a real `text-decoration` rather than a positioned pseudo element, because a pseudo element can only be positioned against the whole block and a wrapping gift title would be struck through the gap between its lines. The state is persistent but the motion is one-shot and confined to the row that changed. And the whole effect buys one thing: bought items recede, so the ones still needing a present carry the weight.

### The Member Row (signature)
A Hairline-separated row, 64px minimum, a full-bleed ghost button with the member's name in Literata 18px/600 above their gift count in Onest 13px, and a ChevronRight in Slate that hides when delete mode opens. The count has three states, not two: a member with no ideas at all and a member whose list is bought out say different things, because the member with an empty list is the one who most needs a present. The count is set in Petrol while there is still something to act on and recedes to Slate only once the list is done.

### Dialogs
- **Shape:** 16px radius, 1px Hairline border, Surface background, 24px padding (16px below `sm`), laid out as a flex column with a 16px gap and its own scroll.
- **Wide dialogs:** `max-w-dialog` (42rem) for the auth and gift-list dialogs; 32rem (`max-w-lg`) for confirmations and short forms.
- **Mobile:** below `sm` a dialog is a full-height sheet squared off at the top, offset 1px below the 56px header, sliding in from the bottom; a dialog with more than five gifts goes full-bleed.
- **Header:** left-aligned, never centred — a centred title has to be re-found on every line, and the only thing worth centring here is the loading spinner. Title is 24px/600 with `pr-8` to clear the close control; description is 15px in Slate.
- **Close:** a 16px X in Slate at the top right, taking the accent wash on hover and open state. Omitted entirely on destructive confirmations, because a three-way exit from a delete prompt is ambiguous; there, Cancel holds focus by default and nothing is destroyed until Confirm is pressed.
- **The one serif title:** the gift-list dialog's title is the member's name and therefore passes `font-serif`. The other three dialogs are titled by a verb and stay in Onest.

### Toasts
Sonner, themed rather than restyled: Surface background, Petrol text, Hairline border, 10px radius, the same floating-menu shadow as dropdowns. Position is responsive — bottom-right at 640px and up, top-centre below it, so a toast never covers the primary control on a phone.

### Dropdown Menu
Minimum 160px wide, 16px radius, Paper/Popover background, 1px Hairline border, the floating-menu shadow, 4px padding. Items are 12.5px vertical padding at 15px Onest with an 8px radius. Keyboard focus inside a Radix menu lands on `tabindex="-1"`, where `:focus-visible` never matches, so the highlight is driven by `data-[highlighted]:bg-accent` — the same 8% ink wash as everywhere else.

## Do's and Don'ts

### Do:
- **Do** keep the page Paper, the list band Frost, and the floating surface Surface. Three grounds, stepped in that order.
- **Do** separate things with a Hairline (1px) or with whitespace. Both are cheap and neither claims an object exists.
- **Do** use the 4px spacing unit and stay inside the small scale: 8 / 16 / 24 / 32 / 48 / 64. Large gaps are few and vertical.
- **Do** use the 15px body size and 13px meta, and cap reading measures — 40ch in the app, 46ch for a lead, 68ch for legal prose.
- **Do** make touch targets 44px or taller on anything filled in on a phone, and 48px for a dialog's primary action.
- **Do** animate exactly one moment — the strike and the row settling into Frost — and leave every other state change as a 150ms colour transition.
- **Do** honour `prefers-reduced-motion`: everything collapses to a state change with no movement, the strike still appears but already complete, and only the loading spinner keeps spinning, because a stopped spinner is a broken affordance.

### Don't:
- **Don't** put things in cards. There are no cards in this system; a repeated item is a row of a list with a hairline above it and square corners.
- **Don't** add a second warm colour, or use Marigold anywhere but the strike and the ticked box beside it. One warm colour, spent on one action.
- **Don't** set anything but a name in Literata. A serif on a heading, a control, a gift title, a count or legal copy breaks the division of labour the whole system rests on.
- **Don't** introduce a `--secondary` tint or a second hover value. Every hover, selection and highlight is one 8% wash of the current ink, which is why one value works on every surface in both themes.
- **Don't** add a shadow to anything that is not a dialog, a dropdown or a toast. If it needs to feel above the page, it is either modal or it is not.
- **Don't** add gradients, glass, blurred panels, glows, or a second focus ring. Focus is one two-tone mechanism defined once in `@layer base`.
- **Don't** animate for decoration — entrance animations, parallax, bounce easing. If a surface feels like it needs motion, it needs a clearer state change instead.
- **Don't** add a mono font or tabular figures. Counts are set in Onest like everything else.
- **Don't** nest interactive elements inside a link, and don't add a second control that duplicates an action a control already performs; both have already caused real accessibility bugs in this codebase.
