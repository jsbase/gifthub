import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/*
  THE THREE DICTIONARIES MUST MOVE TOGETHER, AND TYPESCRIPT ONLY HOLDS HALF OF THAT.

  `AGENTS.md` says a string added to one locale is a broken build in the other two.
  That is true in one direction only. `tests/landing.spec.ts` assigns all three JSON
  files to `Record<LanguageCode, Translations>`, so a key the `Translations` interface
  asks for and a locale lacks does fail `tsc` - by way of a spec that happens to hold
  the assignment, not by way of anything in `app/[lang]/dictionaries.ts`, which casts.

  The other directions are invisible to the compiler. A key added to one file and not
  to the interface is not an excess-property error, because a JSON import is not a
  fresh object literal; a `{count}` that one language drops prints "wishes selected"
  with no number in it; an empty string compiles and renders a blank button. None of
  those has a failing test, and each of them ships.

  So this compares the files with each other, which needs no database and no browser:
  the same leaves in every locale, the same `{placeholders}` in every leaf, and no
  blank in one language where the others have words. It does not judge whether the
  words are good - that is a person's job - only that the three files describe the
  same product.
*/

const require = createRequire(import.meta.url);

type Tree = { [key: string]: Tree | string };

const LOCALES = ['de', 'en', 'ru'] as const;

const dictionaries = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    require(`../../lib/translations/${locale}.json`) as Tree,
  ])
) as Record<(typeof LOCALES)[number], Tree>;

/** Every leaf as `path -> string`, so a missing branch and a missing leaf read alike. */
const leaves = (tree: Tree, prefix = ''): Map<string, string> => {
  const found = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') found.set(path, value);
    else for (const [inner, text] of leaves(value, path)) found.set(inner, text);
  }
  return found;
};

const flat = Object.fromEntries(
  LOCALES.map((locale) => [locale, leaves(dictionaries[locale])])
) as Record<(typeof LOCALES)[number], Map<string, string>>;

const placeholders = (text: string): string =>
  [...text.matchAll(/\{[A-Za-z]+\}/g)]
    .map((match) => match[0])
    .sort()
    .join(',');

test('every locale has the same keys', () => {
  const everyKey = new Set(LOCALES.flatMap((locale) => [...flat[locale].keys()]));
  for (const locale of LOCALES) {
    const missing = [...everyKey].filter((key) => !flat[locale].has(key));
    assert.deepEqual(
      missing,
      [],
      `${locale}.json lacks keys that another locale has - the three move together`
    );
  }
});

test('every key carries the same placeholders in every locale', () => {
  const drift: string[] = [];
  for (const [key, text] of flat.de) {
    for (const locale of LOCALES) {
      const other = flat[locale].get(key);
      if (other !== undefined && placeholders(other) !== placeholders(text)) {
        drift.push(
          `${key}: de has [${placeholders(text)}] and ${locale} has [${placeholders(other)}]`
        );
      }
    }
  }
  assert.deepEqual(
    drift,
    [],
    'a dropped {count} prints a sentence about a number that is not there'
  );
});

test('a string is empty in every locale or in none', () => {
  /*
    Not "no string is empty": `privacy.sections.2.content` is empty in all three on
    purpose - that section is carried by its list items - and a rule that flags it
    would be switched off the first time it was run. What is never intended is the
    asymmetry, one language with a blank where the others have words: that is an
    untranslated placeholder, and it compiles and renders as a blank control.
  */
  const disagree: string[] = [];
  for (const key of flat.de.keys()) {
    const blank = LOCALES.filter((locale) => (flat[locale].get(key) ?? '').trim() === '');
    if (blank.length > 0 && blank.length < LOCALES.length) {
      disagree.push(`${key}: blank in ${blank.join(', ')} but not in the rest`);
    }
  }
  assert.deepEqual(disagree, []);
});

test('the privacy policy names Ko-fi in every locale', () => {
  /*
    The footer links out to Ko-fi, and `PRODUCT.md` (the voluntary-support bullet
    under "Unfulfilled claims") settles that the policy says so. The parity tests
    above cannot see this: a policy that names Ko-fi in German and says nothing in
    Russian has the same keys in all three files. Searched across every section
    rather than pinned to one index, because inserting a section in the middle
    renumbers the rest and what matters is that the policy says it, not which
    number it carries.
  */
  const sectionBody = /^privacy\.sections\.\d+\.content$/;
  for (const locale of LOCALES) {
    const naming = [...flat[locale]].filter(
      ([key, text]) => sectionBody.test(key) && text.includes('Ko-fi')
    );
    assert.ok(
      naming.length > 0,
      `${locale}: no privacy section names Ko-fi, but the footer links to it`
    );
  }
});

test('the selection count has its four plural forms, each carrying the number', () => {
  /*
    The one dictionary section a function reads by *computed* key
    (`selectedCountLabel` picks `one`, `two`, `few` or `many` from the platform's
    plural rules). A missing form is not a compile error and not a missing-key error
    for the locale that does not need it: German never selects `two`, so a German
    file without it would work until the day a rule changed. All four are required in
    every locale, and every one has to print the figure.
  */
  for (const locale of LOCALES) {
    for (const form of ['one', 'two', 'few', 'many']) {
      const text = flat[locale].get(`listSheet.selectedCount.${form}`);
      assert.ok(text, `${locale}: listSheet.selectedCount.${form} is missing`);
      assert.ok(
        text.includes('{count}'),
        `${locale}: listSheet.selectedCount.${form} must carry {count}`
      );
    }
  }
});
