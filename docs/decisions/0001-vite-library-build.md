# 0001: Vite library mode for the build

Date: 2026-10-09

## Context

The brief allows Vite in library mode or tsup. We need ESM with two entries, a UMD single file, type declarations and one CSS file, plus a dev server for the examples.

## Decision

Vite (8.x, rolldown-based) in library mode, one `vite.config.ts` that branches on `command` and `BUILD_TARGET`:

- `vite build` → `dist/index.js`, `dist/ui.js`, `dist/ui.css`, `.d.ts` via `vite-plugin-dts`.
- `BUILD_TARGET=umd vite build` → `dist/ol-cad.umd.js`, global `olcad`. Imports of `ol/x/y` map to the global `ol.x.y` of the OpenLayers full build.
- `vite` (serve) → examples from the repo root with `ol-cad` aliased to `src/`.

## Consequences

- One tool for dev server, examples and library build; tsup would have needed a separate dev server.
- CSS handling is built in (`build.lib.cssFileName`).
- rolldown-based Vite is new; if UMD output misbehaves we can swap the UMD step for a plain rollup config without touching the ESM build.
