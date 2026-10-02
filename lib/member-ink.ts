/**
 * The ink tray.
 *
 * An album has six or seven coloured inks on the desk beside it, and a
 * collector reaches for the same one each time. Each **account** owns one ink
 * here, assigned from a hash of their id so the colour is stable across
 * sessions, devices and reloads - an account whose ink changed on refresh would
 * read as a different person.
 *
 * The key is the account that **owns** the lists, not the list and not the reader.
 * Keying it on the list would give one person's four sheets four colours, which
 * reads as four people; keying it on the reader would give every row on the
 * contents page the same ink and lose the distinction entirely. The owner's id
 * means all of one person's lists carry one ink, and that ink survives renaming
 * the list, sharing it and un-sharing it.
 *
 * Nothing in this module had to change to make that work: `memberInkStyle` takes
 * an opaque id and hashes it, so it never knew what the id was. Only the callers
 * changed, which is the most this could have cost.
 *
 * The discipline that keeps this from becoming confetti: an ink never fills a
 * region. It appears in exactly two places, always at the same weight of
 * ink - the rule under a row on the contents page, and the collected mark in the
 * margin of a cell on the sheet. Several lists on one page therefore read as one
 * printed sheet with several annotations, not as several colours.
 *
 * The index is taken modulo the tray length rather than from a palette lookup
 * so two accounts can share an ink when there are more of them than colours. That
 * is deliberate: the ink identifies a person loosely, the name identifies them
 * exactly, and duplicating a colour is better than running out.
 */
export const MEMBER_INKS = [
  'var(--color-ink-1)',
  'var(--color-ink-2)',
  'var(--color-ink-3)',
  'var(--color-ink-4)',
  'var(--color-ink-5)',
  'var(--color-ink-6)',
] as const;

/**
 * The same six slots, resolved for the one ground in this app that is not light
 * paper: the collected cell.
 *
 * `MEMBER_INKS` is tuned for light ground, where it measures 4.64-8.51:1 under a
 * name on the contents page. A collected cell inverts, so in the light theme the
 * mark lands on near-black (#1e1610) instead - and the same six values measure
 * 2.06-3.78:1 there, which reads as a faint outline rather than as a stamp.
 * WCAG luminance mis-ranks exactly this case, because it ignores chroma: violet
 * measures higher than oxblood and still looks weaker, violet-slate being 28%
 * saturation. The inversion itself is 17.5:1 and `aria-pressed` carries the
 * state, so this is a visible defect rather than a 1.4.11 failure - the mark is
 * `aria-hidden` redundancy, and redundancy still has to be legible.
 *
 * So the tray gets a second resolution rather than a second palette. These are
 * the lightened inks `app/globals.css` already declares for `.dark` - the same
 * six hues at the same chroma intent, nothing new invented. Measured against the
 * two collected grounds that ship today, `--collected` #1e1610 in the light
 * theme and #0b0706 in the dark one: 5.41-9.16:1 and 6.08-10.30:1. In the dark
 * theme they are exactly what `--member-ink-*` already resolves to, so the mark
 * there is untouched to the digit; in the light theme they are what the inverted
 * cell asks for.
 *
 * The two arrays are one tray: same length, same order, index-locked, and these
 * six values must be kept in step with the `.dark` block they are copied from.
 * That is the whole contract, and it is why neither may be reordered alone.
 */
export const MEMBER_INKS_ON_COLLECTED = [
  'hsl(354 62% 64%)', /* oxblood */
  'hsl(232 58% 72%)', /* indigo */
  'hsl(174 46% 58%)', /* verdigris */
  'hsl(38 74% 62%)', /* ochre */
  'hsl(276 34% 72%)', /* violet */
  'hsl(196 58% 62%)', /* teal ink */
] as const;

/**
 * A stable index into the tray for any id. FNV-1a: small, fast, and it spreads
 * sequential ids (which is what the database hands out) across the whole tray
 * instead of filling it in order, so the first four members of a new group do
 * not all land on the first four inks.
 */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The tray slot for an id: the same slot in both resolutions of the tray. */
function trayIndex(id: string): number {
  if (!id) return 0;
  return hash(id) % MEMBER_INKS.length;
}

/**
 * The same ink as a style object. Every use is `style={{ ...memberInkStyle(id) }}`
 * on the element that owns the ink, and its children read `var(--member-ink)` -
 * so an ink is set once per member row or sheet and inherits down through the
 * cells, rather than being written onto each cell.
 *
 * Two properties, one tray slot. `--member-ink` is the resolution for light
 * ground and the only thing the contents page reads; `--member-ink-on-collected`
 * is the same slot resolved for an inverted cell, read by the collected mark in
 * `gift-card.tsx`. Emitting both here rather than at each use site is the point:
 * a caller that needs the mark to hold up on a collected cell should not have to
 * know that the ground changed.
 */
export function memberInkStyle(
  id: string
): Record<string, string> {
  const slot = trayIndex(id);
  return {
    '--member-ink': MEMBER_INKS[slot],
    '--member-ink-on-collected': MEMBER_INKS_ON_COLLECTED[slot],
  } as Record<string, string>;
}
