/**
 * Guards docs/configuration.md against drift: every option path reachable from
 * `EditorConfig` must appear in the docs table, and every documented path must exist.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const TYPES_FILE = resolve(ROOT, 'src/core/config/types.ts');
const DOCS_FILE = resolve(ROOT, 'docs/configuration.md');

function collectTypePaths(): Set<string> {
  const configPath = resolve(ROOT, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);
  const program = ts.createProgram([TYPES_FILE], parsed.options);
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(TYPES_FILE)!;
  const moduleSymbol = checker.getSymbolAtLocation(source)!;
  const rootSymbol = checker
    .getExportsOfModule(moduleSymbol)
    .find((s) => s.name === 'EditorConfig')!;
  const rootType = checker.getDeclaredTypeOfSymbol(rootSymbol);

  const paths = new Set<string>();
  const isLocal = (type: ts.Type): boolean => {
    const decl = type.getSymbol()?.declarations?.[0];
    return !!decl && decl.getSourceFile().fileName.startsWith(ROOT + '/src/');
  };

  const walk = (type: ts.Type, prefix: string, seen: Set<ts.Type>): void => {
    if (type.isUnion()) {
      for (const member of type.types) walk(member, prefix, seen);
      return;
    }
    if (checker.isTupleType(type)) return;
    if (checker.isArrayType(type)) {
      const [element] = checker.getTypeArguments(type as ts.TypeReference);
      if (element) walk(element, `${prefix}[]`, seen);
      return;
    }
    if (!(type.flags & ts.TypeFlags.Object) || !isLocal(type) || seen.has(type)) return;
    // `seen` holds the types on the current path (a recursion guard), not every type visited:
    // a type reused under several prefixes (GeoTIFF sources of basemaps and overlays) is
    // documented under each of them.
    seen.add(type);
    for (const prop of checker.getPropertiesOfType(type)) {
      const path = prefix ? `${prefix}.${prop.name}` : prop.name;
      paths.add(path);
      walk(checker.getTypeOfSymbolAtLocation(prop, source), path, seen);
    }
    seen.delete(type);
  };
  walk(rootType, '', new Set());
  return paths;
}

function collectDocPaths(): Set<string> {
  const markdown = readFileSync(DOCS_FILE, 'utf8');
  const paths = new Set<string>();
  for (const line of markdown.split('\n')) {
    const match = /^\|\s*`([a-zA-Z0-9_.[\]]+)`\s*\|/.exec(line);
    if (match) paths.add(match[1]!);
  }
  return paths;
}

describe('docs/configuration.md', () => {
  const typePaths = collectTypePaths();
  const docPaths = collectDocPaths();

  it('finds options in both sources', () => {
    expect(typePaths.size).toBeGreaterThan(0);
    expect(docPaths.size).toBeGreaterThan(0);
  });

  it('documents every option of EditorConfig', () => {
    const missing = [...typePaths].filter((p) => !docPaths.has(p)).sort();
    expect(missing, 'options missing from docs/configuration.md').toEqual([]);
  });

  it('documents no option that does not exist', () => {
    const stale = [...docPaths].filter((p) => !typePaths.has(p)).sort();
    expect(stale, 'documented options missing from EditorConfig').toEqual([]);
  });
});
