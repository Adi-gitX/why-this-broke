# why-broke

**Find out what changed since your build last worked.**

[![npm version](https://img.shields.io/npm/v/why-broke.svg?color=cb3837)](https://www.npmjs.com/package/why-broke)
[![npm downloads](https://img.shields.io/npm/dm/why-broke.svg)](https://www.npmjs.com/package/why-broke)
[![node](https://img.shields.io/node/v/why-broke.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/why-broke.svg)](./LICENSE)

You pull, you run the build, it fails. You did not touch anything. The error points at a line of code that has not changed in months.

The real cause is almost never on that line. It is a dependency that moved under you, a Node version that differs from your teammate's, an environment variable they added and you do not have, or a config file that changed three commits ago. Stack traces cannot see any of that.

`why-broke` records the state of your project while it works, and when it stops working, tells you exactly what is different.

```
$ why-broke npm run build

> demo-app@1.0.0 build
TypeError: fetch is not a function

Command failed with exit code 1. Looking for what changed.

Baseline recorded 3 hours ago after npm run build (Node v20.11.1, darwin-arm64).

Likely causes
  ! 1 declared package not installed  [Dependencies]
    In package.json but not in node_modules: dayjs.
    Fix: Run npm ci.
  ! node-fetch 2.6.12 -> 3.3.2  [Dependencies]
    node-fetch 3 is published as ES modules only. require("node-fetch") throws ERR_REQUIRE_ESM.
    Fix: Use await import("node-fetch"), switch to the global fetch on Node 18+, or pin node-fetch@2.
  ! 1 new variable in .env.example  [Environment]
    Declared in .env.example since the baseline but not set here: STRIPE_SECRET_KEY.
    Fix: Copy the new entries from .env.example into your .env and fill in the values.

Possible cause
  ? Lockfile changed  [Dependencies]
    The lockfile differs from the baseline, so transitive dependencies may have moved even where package.json did not.
    Fix: Run npm ci to install exactly what the lockfile says.

Also changed
  - 5 files changed since 866d465  [Source]
    .env.example, package-lock.json, package.json, src.js, tsconfig.json
    Fix: If nothing above explains the failure, the cause is in the code: git diff 866d465 4c20adc --stat.
```

## Install

```sh
npm install --save-dev why-broke
```

Requires Node 18 or newer. Works with npm, yarn, pnpm and bun projects.

## Usage

There are three ways to use it. Pick one.

### Wrap the command

```sh
why-broke npm run build
why-broke npm test
why-broke "npm run lint && npm run build"
```

If the command succeeds, the current state is saved as the baseline. If it fails, the state is compared against the last baseline and the differences are printed under the command's own output. The exit code is the command's exit code, so this is safe to use inside npm scripts and CI.

This is the most precise mode, because the baseline is only ever recorded from a state that is known to work.

### Record and check by hand

```sh
why-broke record    # while things work
why-broke check     # when they stop working
```

`check` exits 0 when nothing drifted, 1 when it found something, and 2 when there is no baseline to compare against.

### Refresh the baseline on every install

```sh
why-broke init
```

This adds `why-broke record` to the `postinstall` script in package.json, adds the baseline file to `.gitignore`, and records a first baseline. From then on every `npm install` refreshes the baseline, so there is always a recent one when something breaks.

`init` refuses to run unless `why-broke` is already a dependency of the project. A postinstall hook that calls a missing binary would break `npm install` for everyone who clones the repository.

Note that an install-time baseline reflects the state right after installing, before you have confirmed the build works. If you want the stronger guarantee, wrap your build command instead.

## What it compares

Each check runs these detectors against the baseline. Findings are grouped as a likely cause, a possible cause, or background information.

| Area | Checked | Reported when |
|---|---|---|
| Runtime | Node version, npm version, OS, CPU architecture | Node or npm major changes, platform changes |
| Installed packages | The version and module type of every declared dependency, read from `node_modules` | A declared package is missing, a package crossed a major version, a package became ESM-only, or a known breaking migration matched |
| package.json | Dependency ranges | A range was added, changed or removed |
| Lockfile | Hash and type of `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` or `bun.lock` | The lockfile changed, or the project switched package manager |
| Configuration | Hashes of build and tool config files such as `tsconfig.json`, `vite.config.ts`, `next.config.js`, `.eslintrc`, `Dockerfile`, `.nvmrc` | A file changed, was deleted, or appeared |
| Environment | Names of variables in the shell plus keys in `.env` and `.env.local`, and keys declared in `.env.example` | A variable set at baseline time is not set now, or `.env.example` declares a new key that is not set |
| Source | Current commit and whether the tree is dirty | Lists the files changed since the baseline commit, as context |

Installed versions are read directly from each package's manifest in `node_modules`, not from `npm ls`, so the check does not fail or go blind when the tree has peer-dependency warnings.

Variables that differ between terminals and editors (`TERM_*`, `VSCODE_*`, `ITERM_*`, `PWD`, `SHLVL` and similar) are ignored, so opening a different terminal does not look like drift.

### Known breaking migrations

When an installed package crosses a version boundary that is known to break existing code, the finding says what broke and how to fix it instead of only reporting the version numbers. The list currently covers:

| Package | Boundary | What breaks |
|---|---|---|
| `node-fetch`, `chalk`, `ora`, `nanoid`, `got`, `execa`, `inquirer` | ESM-only majors | `require()` throws `ERR_REQUIRE_ESM` |
| `uuid` | 7 | Default export and deep imports removed |
| `axios` | 1 | `AxiosHeaders` and an ESM build that Jest resolves by default |
| `eslint` | 9 | Flat config is the default, `.eslintrc` is ignored |
| `prettier` | 3 | `trailingComma` default and async plugin loading |
| `tailwindcss` | 4 | CSS-based config, new PostCSS plugin, `@tailwind` directives removed |
| `webpack` | 5 | No automatic Node core polyfills |
| `jest` | 28 | `jest-environment-jsdom` no longer bundled |
| `react-router-dom` | 6 | `Switch`, `Redirect`, `useHistory` removed |
| `next` | 15 | Request APIs and route params became async |
| `express` | 5 | Route path syntax changed |

Packages not on this list are still caught by the generic checks: a major bump is reported as a likely cause, and a package whose manifest switches to `"type": "module"` is flagged as an ESM transition regardless of its name. To add a migration, edit [src/engine/knownBreakingChanges.ts](src/engine/knownBreakingChanges.ts) and open a pull request with a link to the package's changelog.

## Continuous integration

The baseline is a local file and is not committed, so a fresh CI runner starts without one. Persist it between runs with the cache. On GitHub Actions:

```yaml
- uses: actions/cache@v4
  with:
    path: .why-broke.json
    key: why-broke-${{ runner.os }}-${{ github.run_id }}
    restore-keys: why-broke-${{ runner.os }}-

- run: npm ci
- run: npx why-broke npm run build
```

Each run restores the most recent baseline through the prefix in `restore-keys`, and saves a new one under its own run id when the build passes. A failing run prints the diff against the last passing run directly in the job log.

## The baseline file

`.why-broke.json` is written in the project root. Add it to `.gitignore` (`init` does this for you). It records:

- Node and npm versions, platform and architecture
- dependency ranges from package.json, and the installed version and module type of each declared package
- a SHA-256 hash of the lockfile and of each recognised config file
- the names of environment variables, and the keys declared in `.env.example`
- the current commit, branch and dirty state
- the command that was run and the working directory, when recorded through the wrapper

It never contains environment variable values, file contents or source code. The command and working directory are the only free text in the file.

## Programmatic use

Everything the CLI does is available from the package.

```ts
import { saveSnapshot, analyzeFailure, explainIssues } from 'why-broke';

saveSnapshot('.why-broke.json', { command: 'npm run build' });

const findings = analyzeFailure('.why-broke.json');
console.log(explainIssues(findings));
```

`analyzeFailure` returns an array of findings with `type` (`CRITICAL`, `WARNING`, `INFO`), `confidence`, `category`, `title`, `message` and `remedy`, ordered most likely cause first. The individual detectors and the `InferenceEngine` class are exported if you want to run a subset or add your own.

## Limitations

- One project root per baseline. In a monorepo, run it inside each package.
- Only top-level dependencies are version-tracked. Transitive changes show up through the lockfile hash, not by name.
- Environment detection sees the shell, `.env` and `.env.local`. Variables injected later by a framework are not visible.
- The comparison is between two points in time on one machine. It does not tell you why a build passes on your machine and fails on a colleague's unless you copy their baseline file over.

## Contributing

```sh
git clone https://github.com/Adi-gitX/why-this-broke.git
cd why-this-broke
npm install
npm test
```

Tests run against the compiled output with Node's built-in test runner. Pull requests that add a breaking-change rule should include the upstream changelog link; pull requests that change a detector should include a test.

## License

[MIT](./LICENSE)
