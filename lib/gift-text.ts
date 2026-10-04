/**
 * How much of a wish fits on a sheet.
 *
 * Nothing capped these, and Postgres will hold whatever it is given: a `String` in
 * the schema is unbounded text, so a wish with a thousand characters in its title
 * was accepted, stored, returned, and rendered - and the cell grew to fill the
 * viewport, pushing the rest of the sheet off the page. One wish had become a page.
 *
 * Three numbers, and they are not the same number. The **title** is the largest
 * object in the cell and the thing a buyer reads from across the room, so it is the
 * shortest and the only one with a floor anybody would notice. The **note** is
 * detail a reader chooses to open, so it is generous. The **link** is not prose at
 * all - it is a URL that is never shown, only followed - so it is capped at the
 * length of the longest address in use and not a character more.
 *
 * The client puts the same numbers on its inputs as `maxLength`, which means the
 * limit is felt rather than described: a field stops accepting keystrokes at the
 * boundary instead of refusing the submission afterwards. The server checks them
 * again, because a `maxLength` attribute is a claim about the browser and not about
 * the request - `lib/account-name.ts` and `lib/email.ts` are both built on the same
 * principle, and a limit that only exists in the DOM is not a limit.
 */
export const MAX_TITLE_LENGTH = 120;
export const MIN_TITLE_LENGTH = 2;
export const MAX_NOTE_LENGTH = 600;
export const MAX_URL_LENGTH = 2000;

/** The three fields a wish is made of, and what may go in each. */
export type GiftField = 'title' | 'description' | 'url';

export const GIFT_FIELD_LIMITS: Record<
  GiftField,
  { max: number; min?: number }
> = {
  title: { max: MAX_TITLE_LENGTH, min: MIN_TITLE_LENGTH },
  description: { max: MAX_NOTE_LENGTH },
  url: { max: MAX_URL_LENGTH },
};

/**
 * The one rule, for the client and the server.
 *
 * Returns `undefined` when the field is acceptable and a sentence when it is not.
 * The sentence is the one the field should carry, in the reader's language - the
 * same contract `lib/account-name.ts` and `lib/email.ts` use, and for the same
 * reason: a refusal that arrives as a toast under a form the reader is still looking
 * at is a worse instruction than one printed under the field that caused it.
 */
export function checkGiftField(
  field: GiftField,
  value: string,
  messages: { tooLong: (max: number) => string; tooShort?: (min: number) => string }
): string | undefined {
  const { max, min } = GIFT_FIELD_LIMITS[field];
  // Counted in code points, not UTF-16 units: an emoji or an accented character is
  // one character to the person who typed it and two in a JavaScript string, and a
  // limit that silently halves somebody's allowance in one script is a limit that is
  // wrong for them.
  const length = [...value.trim()].length;

  if (min !== undefined && length < min) {
    return messages.tooShort ? messages.tooShort(min) : undefined;
  }
  if (length > max) return messages.tooLong(max);
  return undefined;
}