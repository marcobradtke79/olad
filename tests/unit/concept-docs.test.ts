/**
 * Guards docs/concepts/ against rot: every concept file is listed in the index, every
 * relative link resolves, links between two concepts exist in both directions, every file
 * follows the template, and every source path a concept names exists.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const CONCEPTS_DIR = resolve(ROOT, 'docs/concepts');
const INDEX = 'README.md';
const REQUIRED_SECTIONS = ['## Related', '## Open questions', '## Source'];

interface ConceptFile {
  name: string;
  text: string;
  /** Targets of relative Markdown links, without anchors. */
  links: string[];
  /** Backticked repo paths (`src/...`, `tests/...`, `test-server/...`). */
  paths: string[];
}

function readConcepts(): ConceptFile[] {
  if (!existsSync(CONCEPTS_DIR)) return [];
  return readdirSync(CONCEPTS_DIR)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const text = readFileSync(resolve(CONCEPTS_DIR, name), 'utf8');
      // Fenced code blocks hold the template, not real links or paths.
      const prose = text.replace(/```[\s\S]*?```/g, '');
      const links = [...prose.matchAll(/\]\(([^)\s]+)\)/g)]
        .map((m) => m[1]!)
        .filter((target) => !/^[a-z]+:/.test(target) && !target.startsWith('#'))
        .map((target) => target.split('#')[0]!)
        .filter((target) => target.length > 0);
      const paths = [...prose.matchAll(/`((?:src|tests|test-server)\/[^`\s]+)`/g)]
        .map((m) => m[1]!)
        .filter((path) => !path.includes('*'));
      return { name, text, links, paths };
    });
}

/** The concept file a relative link points at, or `null` for links outside the folder. */
function conceptTarget(target: string): string | null {
  return /^[a-z0-9-]+\.md$/.test(target) ? target : null;
}

// docs/concepts/ is a local working folder (see .gitignore): a fresh clone has none.
describe.skipIf(!existsSync(CONCEPTS_DIR))('docs/concepts', () => {
  const files = readConcepts();
  const concepts = files.filter((f) => f.name !== INDEX);
  const index = files.find((f) => f.name === INDEX);

  it('has an index and concept files', () => {
    expect(index).toBeDefined();
    expect(concepts.length).toBeGreaterThan(0);
  });

  it('lists every concept file in the index', () => {
    const listed = new Set(index!.links.map(conceptTarget).filter((t): t is string => t !== null));
    const unlisted = concepts.map((f) => f.name).filter((name) => !listed.has(name));
    expect(unlisted, 'concept files missing from docs/concepts/README.md').toEqual([]);
  });

  it('links only to files that exist', () => {
    const broken: string[] = [];
    for (const file of files) {
      for (const target of file.links) {
        if (!existsSync(resolve(CONCEPTS_DIR, target))) broken.push(`${file.name} -> ${target}`);
      }
    }
    expect(broken, 'broken relative links').toEqual([]);
  });

  it('follows the template', () => {
    const violations: string[] = [];
    for (const file of concepts) {
      if (!/^\*\*Status:\*\* /m.test(file.text))
        violations.push(`${file.name}: no **Status:** line`);
      for (const section of REQUIRED_SECTIONS) {
        if (!file.text.includes(`\n${section}\n`)) violations.push(`${file.name}: no "${section}"`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('links related concepts in both directions', () => {
    const linksOf = new Map(
      concepts.map((f) => [
        f.name,
        new Set(f.links.map(conceptTarget).filter((t): t is string => t !== null)),
      ]),
    );
    const missing: string[] = [];
    for (const [name, targets] of linksOf) {
      for (const target of targets) {
        if (target === name || target === INDEX) continue;
        if (!linksOf.get(target)?.has(name))
          missing.push(`${target} does not link back to ${name}`);
      }
    }
    expect(missing, 'one-directional links between concepts').toEqual([]);
  });

  it('names only source paths that exist', () => {
    const stale: string[] = [];
    for (const file of files) {
      for (const path of file.paths) {
        if (!existsSync(resolve(ROOT, path))) stale.push(`${file.name}: ${path}`);
      }
    }
    expect(stale, 'source paths that do not exist').toEqual([]);
  });
});
