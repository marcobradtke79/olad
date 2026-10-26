import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** A test fixture's text. jsdom replaces `import.meta.url`; Vitest runs from the repository root. */
export const fixture = (name: string): string =>
  readFileSync(resolve('src/core/discovery/fixtures', name), 'utf8');
