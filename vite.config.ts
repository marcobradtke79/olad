import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/** `ol`, every `ol/*` subpath and `proj4` stay external in all builds. */
const external = (id: string): boolean => id === 'ol' || id.startsWith('ol/') || id === 'proj4';

/** Map an external import to the global the OpenLayers full build exposes: `ol/layer/Tile` → `ol.layer.Tile`. */
const globalName = (id: string): string => {
  if (id === 'proj4') return 'proj4';
  if (id === 'ol') return 'ol';
  return 'ol.' + id.slice('ol/'.length).replace(/\.js$/, '').split('/').join('.');
};

const srcDir = resolve(import.meta.dirname, 'src');
const distDir = resolve(import.meta.dirname, 'dist');

/**
 * `ol` is an ES module package without an `exports` map, so Node and webpack 5 only resolve fully
 * specified subpaths: `ol/Feature` → `ol/Feature.js` in the published ESM build and its types.
 */
const olSubpath = (id: string): string =>
  id.startsWith('ol/') && !id.endsWith('.js') ? `${id}.js` : id;

/**
 * Fully specify the imports in a declaration file written to `dist/` (mirroring `src/`), so the
 * types also work with `moduleResolution: node16 / nodenext`: `ol/Feature` → `ol/Feature.js`,
 * `./core/Editor` → `./core/Editor.js`, `./ui` → `./ui/index.js`.
 */
const fullySpecifyTypes = (filePath: string, content: string): string => {
  const sourceDir = dirname(resolve(srcDir, relative(distDir, filePath)));
  const specify = (id: string): string => {
    if (id.startsWith('ol/')) return olSubpath(id);
    if (!id.startsWith('.') || /\.(js|css)$/.test(id)) return id;
    if (existsSync(resolve(sourceDir, `${id}.ts`))) return `${id}.js`;
    if (existsSync(resolve(sourceDir, id, 'index.ts'))) return `${id}/index.js`;
    return id;
  };
  return content.replace(
    /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\2/g,
    (_match, prefix: string, quote: string, id: string) => prefix + quote + specify(id) + quote,
  );
};

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    // `pnpm dev`: serve the repo root so examples/ can reach src/ and dist/.
    return {
      resolve: {
        alias: [
          { find: 'ol-cad/ui.css', replacement: resolve(import.meta.dirname, 'src/ui/theme.css') },
          { find: 'ol-cad/ui', replacement: resolve(import.meta.dirname, 'src/ui/index.ts') },
          { find: /^ol-cad$/, replacement: resolve(import.meta.dirname, 'src/index.ts') },
        ],
      },
    };
  }

  if (process.env.BUILD_TARGET === 'umd') {
    return {
      build: {
        emptyOutDir: false,
        sourcemap: true,
        lib: {
          entry: resolve(import.meta.dirname, 'src/umd.ts'),
          name: 'olcad',
          formats: ['umd'],
          fileName: () => 'ol-cad.umd.js',
          cssFileName: 'ui',
        },
        rollupOptions: {
          external,
          output: { globals: globalName, exports: 'named' },
        },
      },
    };
  }

  return {
    plugins: [
      dts({
        tsconfigPath: './tsconfig.json',
        include: ['src'],
        exclude: ['src/**/*.test.ts', 'src/umd.ts'],
        beforeWriteFile: (filePath, content) => ({
          filePath,
          content: fullySpecifyTypes(filePath, content),
        }),
      }),
    ],
    build: {
      sourcemap: true,
      lib: {
        entry: {
          index: resolve(import.meta.dirname, 'src/index.ts'),
          ui: resolve(import.meta.dirname, 'src/ui/index.ts'),
        },
        formats: ['es'],
        fileName: (_format, name) => `${name}.js`,
        cssFileName: 'ui',
      },
      rollupOptions: { external, output: { paths: olSubpath } },
    },
  };
});
