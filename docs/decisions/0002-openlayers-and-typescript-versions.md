# 0002: Supported OpenLayers range and TypeScript version

Date: 2026-10-09

## Decision

- Peer dependency `ol: >=9 <11`. At project start the current major is 10 (10.11.0); the brief asks for current and previous major. Development and tests run against 10.x.
- TypeScript 5.9 rather than the 7.x native compiler: typescript-eslint and vite-plugin-dts do not support 7 yet. Revisit when the ecosystem catches up.
- `erasableSyntaxOnly` is on so `test-server/server.ts` runs with Node's built-in type stripping and no extra loader.
