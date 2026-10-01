// Lint warning ratchet.
//
// `npm run lint` fails on errors, but warnings would accumulate silently from
// here on - the same failure mode this gate exists to kill, one level down. So
// warnings are compared against a committed baseline and the run fails on any
// warning the baseline does not already account for.
//
//   npm run lint           ESLint's own exit code: errors fail, warnings do not
//   npm run lint:ratchet   this script: fails on warnings the baseline lacks
//   npm run lint:baseline  accept the current warnings as the new baseline
//
// A warning is identified by file, rule and its first line of prose. Line
// numbers are deliberately not part of the identity - they move whenever
// unrelated code is edited above them - and neither is the code frame that
// rules such as react-hooks/set-state-in-effect append to the message, which
// embeds an absolute path and would tie the baseline to one machine. Duplicates
// count: three setState calls in one file are three warnings, and only the
// fourth is new. Lowering the debt passes; only raising it fails.
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const baselineName = 'lint-baseline.json';
const baselineFile = path.join(rootDir, baselineName);
const writeBaseline = process.argv.includes('--write');
const SEP = '\u0000';

const results = await new ESLint({ cwd: rootDir }).lintFiles(['.']);

const warnings = [];
const errors = [];
for (const result of results) {
  // Relative, forward-slashed: the baseline is committed, so it has to mean the
  // same thing on Windows and on the Linux runner.
  const file = path.relative(rootDir, result.filePath).split(path.sep).join('/');

  for (const message of result.messages) {
    const rule = message.ruleId ?? 'no rule';
    const summary = message.message.split('\n')[0].trim();

    if (message.severity === 2) {
      errors.push(`${file}:${message.line}:${message.column} ${rule} ${summary}`);
    } else {
      warnings.push({
        key: `${file}${SEP}${rule}${SEP}${summary}`,
        where: `${file}:${message.line}:${message.column} ${rule}`,
      });
    }
  }
}

if (writeBaseline) {
  const keys = warnings.map((warning) => warning.key).sort();
  await fs.writeFile(
    baselineFile,
    `${JSON.stringify({ warnings: keys }, null, 2)}\n`
  );
  console.log(
    `Baseline written: ${keys.length} warning(s) in ${new Set(keys).size} distinct place(s).`
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

let baseline;
try {
  ({ warnings: baseline = [] } = JSON.parse(await fs.readFile(baselineFile, 'utf8')));
} catch {
  console.error(
    `::error::Could not read ${baselineName}. Run \`npm run lint:baseline\` to create it.`
  );
  process.exit(1);
}

const tally = (keys) => {
  const counts = new Map();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
};

const allowed = tally(baseline);
const found = tally(warnings.map((warning) => warning.key));

const added = [];
for (const warning of warnings) {
  const surplus =
    (found.get(warning.key) ?? 0) - (allowed.get(warning.key) ?? 0);
  if (surplus > 0) {
    added.push(`${warning.where}  ${warning.key.split(SEP).at(-1)}`);
    // Charge this occurrence against the surplus so three identical keys in one
    // file are reported once, not once each.
    found.set(warning.key, (found.get(warning.key) ?? 0) - 1);
  }
}

const released = [...allowed].reduce(
  (total, [key, count]) => total + Math.max(0, count - (warnings.filter((w) => w.key === key).length)),
  0
);

if (released > 0) {
  console.log(
    `${released} warning(s) no longer occur. Run \`npm run lint:baseline\` to record the lower debt.`
  );
}

if (errors.length > 0) {
  console.error(`${errors.length} error(s), which \`npm run lint\` also reports:`);
  for (const error of errors.sort()) console.error(`  ${error}`);
}

if (added.length > 0) {
  console.error(`${added.length} new warning(s) not in ${baselineName}:`);
  for (const warning of added.sort()) console.error(`  ${warning}`);
  console.error(
    'Fix them, or accept the added debt deliberately with `npm run lint:baseline`.'
  );
}

if (added.length > 0 || errors.length > 0) {
  process.exit(1);
}

console.log(
  `Lint ratchet: ${warnings.length} warning(s), all accounted for in ${baselineName}.`
);