/**
 * The ink tray.
 *
 * An album has six or seven coloured inks on the desk beside it, and a
 * collector reaches for the same one each time. Each member of a group owns one
 * ink here, assigned from a hash of their id so the colour is stable across
 * sessions, devices and reloads - a member whose ink changed on refresh would
 * read as a different person.
 *
 * The discipline that keeps this from becoming confetti: an ink never fills a
 * region. It appears in exactly three places, always at the same weight of
 * ink - the numeral in the corner of that member's cells, the rule under their
 * name, and the cancellation ring on a collected idea. Six members on one sheet
 * therefore read as one printed page with six annotations, not as six colours.
 *
 * The index is taken modulo the tray length rather than from a palette lookup
 * so two members can share an ink when a group is larger than the tray. That is
 * deliberate: the ink identifies a person loosely, the name identifies them
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

/** The ink token for a member. Falls back to the first ink for an empty id. */
export function memberInk(id: string): string {
  if (!id) return MEMBER_INKS[0];
  return MEMBER_INKS[hash(id) % MEMBER_INKS.length];
}

/**
 * The same ink as a style object. Every use is `style={{ ...memberInkStyle(id) }}`
 * on the element that owns the ink, and its children read `var(--member-ink)` -
 * so an ink is set once per member row or sheet and inherits down through the
 * cells, rather than being written onto each cell.
 */
export function memberInkStyle(
  id: string
): Record<string, string> {
  return { '--member-ink': memberInk(id) } as Record<string, string>;
}
