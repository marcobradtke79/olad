#!/usr/bin/env node
// Prints the CHANGELOG.md section of one version, used as the release notes, and fails when the
// section is missing or empty, so a tag without a changelog entry cannot be released:
//   node scripts/changelog-section.js 0.2.0
import { readFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) {
  console.error('usage: node scripts/changelog-section.js <version>');
  process.exit(2);
}

const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no section "## [${version}]"`);
  process.exit(1);
}
let end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
if (end === -1) end = lines.length;
// Keep a Changelog link definitions ([x]: url) at the end are not part of the notes.
const section = lines
  .slice(start + 1, end)
  .filter((line) => !/^\[[^\]]+\]:\s/.test(line))
  .join('\n')
  .trim();
if (!section) {
  console.error(`CHANGELOG.md section "## [${version}]" is empty`);
  process.exit(1);
}
process.stdout.write(`${section}\n`);
