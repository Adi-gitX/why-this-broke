# Contributing

Thanks for looking under the hood. This file explains how the code is laid out, how to run it, and what a good change looks like.

## Setup

```sh
git clone https://github.com/Adi-gitX/why-this-broke.git
cd why-this-broke
npm install
npm test
```

`npm test` compiles `src/` to `dist/` and runs the suite in `tests/` with Node's built-in test runner. Tests import from `dist/`, so they exercise exactly what ships. Node 18 or newer is required.

To try a local build against a real project:

```sh
npm run build
node /path/to/why-this-broke/dist/cli.js check
```

## How the code is organised

```
src/
  cli.ts                     argument parsing, spinners, exit codes
  snapshot.ts                captures the current state and reads/writes .why-broke.json
  analyze.ts                 loads the baseline, captures now, runs the engine
  engine/
    index.ts                 runs every detector and orders the findings
    semver.ts                tiny version parser and bump classifier
    knownBreakingChanges.ts  package version boundaries with a reason and a fix
    detectors/               one file per area: runtime, dependencies, config, env, git
  reporter/explain.ts        turns findings into terminal text
  internal/types.ts          SystemState, DiffResult and the Detector interface
```

A detector is a class with one method, `detect(baseline, current)`, returning an array of findings. It must not read the filesystem or run commands; everything it needs should already be in the two `SystemState` objects. That keeps detectors pure and trivially testable. If a detector needs new data, add it to `SystemState` and capture it in `snapshot.ts`.

A finding has a `type` (CRITICAL, WARNING, INFO), a `confidence`, a short `title`, a `message` explaining why it matters, and a `remedy` the user can act on. Write the remedy as the command you would tell a colleague to run.

## Adding a known breaking migration

This is the easiest and most useful contribution. Open `src/engine/knownBreakingChanges.ts` and add an entry:

```ts
'package-name': [{
    applies: crosses(5),   // from any major below 5 to 5 or above
    reason: 'What breaks, including the error text a user would see.',
    fix: 'The exact command or code change that resolves it.'
}]
```

Keep `reason` factual and specific. "Major release with breaking changes" is not a rule; the generic major-bump check already says that. A rule earns its place by naming the actual failure and its fix. Include a link to the upstream changelog in your pull request so a reviewer can confirm it.

Add a test in `tests/detectors.test.js` alongside the existing node-fetch case.

## Adding a detector

1. Create `src/engine/detectors/YourDetector.ts` implementing `Detector`.
2. Register it in `src/engine/index.ts`.
3. Export it from `src/index.ts`.
4. Add tests that cover: nothing changed, the change you detect, and a legacy baseline missing the field you read.
5. Add a row to the "What it compares" table in README.md.

## Pull requests

- One change per pull request.
- Add or update tests for anything in `engine/` or `reporter/`.
- Add a line under the unreleased heading in CHANGELOG.md.
- CI runs the suite on Linux, macOS and Windows across Node 18, 20 and 22. It needs to be green.

## Releasing (maintainers)

1. Move the unreleased changelog entries under a new version heading.
2. `npm version minor` (or `patch`), which updates package.json and creates the tag.
3. `git push --follow-tags`.

The release workflow publishes to npm with provenance and creates the GitHub release from the changelog section.
