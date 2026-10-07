# Changelog

## Unreleased

- `check` emits GitHub Actions error and warning annotations alongside the text report when `GITHUB_ACTIONS=true`.

## 1.5.1

### Added

- `check --json` for machine-readable output in scripts and CI.

### Changed

- README documents `--json`, links the contributing guide, and shows the CI status badge.

## 1.5.0

### Changed

- Installed versions are read from each package's manifest in `node_modules` instead of `npm ls`. The old approach returned nothing whenever `npm ls` exited non-zero, which it does for any peer-dependency warning, so version drift was silently missed in many projects. The new approach also works for yarn, pnpm and bun.
- `check` exits 2 when there is no usable baseline, instead of 1. Exit 1 now always means drift was found.
- `init` refuses to add the postinstall hook unless `why-broke` is a dependency of the project, because a hook that calls a missing binary breaks `npm install` for everyone who clones the repository.
- `init` also adds the baseline file to `.gitignore` and records a first baseline.
- Findings are grouped by severity in the report and each one has a short title, a one-line explanation and a fix. The baseline's age and the command it was recorded after are shown at the top.
- The postinstall banner that printed in every consumer's terminal has been removed, and the package no longer ships install scripts.
- `why-broke <cmd> <args...>` passes arguments through without re-joining them, so quoting survives. A single argument is still treated as a shell string.

### Added

- `.env` and `.env.local` keys are included in the environment comparison, and keys newly declared in `.env.example` that are not set are reported.
- Shell, terminal and editor variables (`TERM_*`, `VSCODE_*`, `ITERM_*`, `PWD`, `SHLVL` and similar) are ignored so that opening a different terminal is not reported as drift.
- A declared dependency that is missing from `node_modules` is reported as a likely cause.
- Any package whose manifest switches to `"type": "module"` is flagged as an ESM transition, independent of the known-migrations list.
- Known breaking migrations for chalk, ora, nanoid, got, execa, inquirer, eslint, prettier, tailwindcss, webpack, jest, react-router-dom, next and express.
- Lockfile detection for `npm-shrinkwrap.json` and bun lockfiles, and detection of a package-manager switch.
- npm major version changes are reported.
- `--help`, `--version`, and a test suite (`npm test`).

### Fixed

- The sample output in the README did not match what the tool printed.
- Config detection covers TypeScript, ESM and CommonJS variants of common config files, plus `.nvmrc`, `.npmrc`, `.node-version` and `.tool-versions`.
- A detector that throws no longer aborts the whole analysis.

## 1.4.4

- Fixed an unresolvable package entry point.
