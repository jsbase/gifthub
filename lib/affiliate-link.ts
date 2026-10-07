/*
  Which of our affiliate programmes earns on a gift's link, and the address to
  send the reader to when one does.

  The core knows no shop. A programme says which addresses are its own and how to
  mark one, and this asks the programmes it is given in order. Adding a shop is a
  new programme next to `affiliate-programs/amazon-de.ts` and a line in
  `lib/affiliate.ts`; nothing here changes. That is also why the answer is one
  call returning both the address and whether it earns: the link and the mark that
  says it is an advertisement come from the same decision and cannot disagree, which
  two separate functions asked about the same link could.

  This runs where the link is rendered and not where it is saved, for two reasons.
  Every wish that already exists is covered with no migration, and the stored
  address stays what the person typed, so changing or dropping an ID later is one
  environment variable and not a rewrite of the table. The cost is that a sheet
  must print the original and use this only for the `href`; one that printed the
  result would show our tracking parameters under every wish.

  Imports nothing at run time, only types: `node --test` cannot resolve `@/` or an
  extensionless path, and a core that needs either could not be tested without a
  database.
*/

export interface AffiliateProgram {
  /** A stable name, for tests and for anything that has to say which one fired. */
  id: string;
  /**
   * Whether `url` is one this programme earns on. The host is compared exactly:
   * `endsWith` or `includes` would take `notamazon.de` and `amazon.de.evil.com`
   * for the real thing and hand anybody who can type a gift link a way to dress
   * their own page in ours. Only ever called with an http or https address.
   */
  recognises(url: URL): boolean;
  /**
   * `url` marked as ours, replacing whatever mark another partner put on it. A new
   * address and not the one it was given. Only called when `recognises` was true.
   */
  apply(url: URL): URL;
  /**
   * Hosts of short links whose redirect leads to an address this programme
   * recognises. The server resolves these on save and nowhere else, and this list
   * is the whole of what it may fetch on the programme's behalf.
   */
  shortHosts?: readonly string[];
}

export interface AffiliateLink {
  /** What the cell should link to. */
  href: string;
  /** Whether `href` earns us a commission, and so has to be marked as an advertisement. */
  earns: boolean;
}

export function affiliateLink(
  url: string,
  programs: readonly AffiliateProgram[]
): AffiliateLink {
  const unchanged = { href: url, earns: false };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return unchanged;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return unchanged;

  const program = programs.find((p) => p.recognises(parsed));
  if (!program) return unchanged;
  return { href: program.apply(parsed).toString(), earns: true };
}
