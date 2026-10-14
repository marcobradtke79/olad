import { resolve } from 'node:path';
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
      rollupOptions: { external },
    },
  };
});
