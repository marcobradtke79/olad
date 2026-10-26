# Releasing

ol-cad is released on GitHub (not on npm). A release is a Git tag `v<version>`; the workflow in
`.github/workflows/release.yml` builds it and attaches the assets, so nothing is uploaded by hand.

## Steps

1. Set the version in `package.json` (semantic versioning; `0.x` while pre-release).
2. In `CHANGELOG.md`, turn the `## [Unreleased]` entries into `## [<version>] - <YYYY-MM-DD>` and
   open a fresh, empty `## [Unreleased]` heading above it; add the version's compare link to the
   link definitions at the end of the file. The workflow refuses a tag whose version has no section.
3. Commit (`chore: release <version>`), tag and push:

   ```sh
   git tag v<version>
   git push origin main v<version>
   ```

A tag with a suffix (`v0.2.0-rc.1`) is published as a pre-release.

## What the workflow does

1. Checks that the tag matches `package.json`.
2. Takes the version's section of `CHANGELOG.md` as release notes (`scripts/changelog-section.js`).
3. Runs lint, typecheck and the unit tests, then `pnpm build` and `pnpm pack`.
4. Collects `ol-cad-<version>.tgz`, `ol-cad.umd.js`, `ol-cad.umd.js.map` and `ui.css` into
   `release/` and writes `SHA256SUMS` (`scripts/release-assets.sh`).
5. Creates [build provenance attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)
   for every file in `release/` (`actions/attest-build-provenance`).
6. Creates the GitHub release with all files of `release/` attached.

The same assets can be produced locally with `pnpm build && pnpm pack && scripts/release-assets.sh`
(no attestation; attestations are signed by the workflow's identity).

## Verifying a download

```sh
# in the folder that holds the downloaded files and SHA256SUMS
shasum -a 256 -c SHA256SUMS
# provenance: which workflow run of which commit built the file (needs the GitHub CLI)
gh attestation verify ol-cad-<version>.tgz --repo marcobradtke79/olad
```

`pnpm add <release URL>` records the package file's integrity hash in the lockfile, so a re-uploaded
asset fails the install.

## Continuous integration

`.github/workflows/ci.yml` runs lint, typecheck, unit tests and the build, and the Playwright
suite against the test server, on every push and pull request.
