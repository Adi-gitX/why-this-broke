<p align="center">
  <img src="https://raw.githubusercontent.com/Adi-gitX/why-this-broke/main/.github/logo.png" alt="why-broke" width="120" />
</p>

<h1 align="center">🦅 why-broke</h1>

<p align="center">
  <strong>Stop guessing. Start reasoning.</strong><br/>
  <em>The causal debugger for JavaScript that tells you WHY your build broke, not just where.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/why-broke"><img src="https://img.shields.io/npm/v/why-broke.svg?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/why-broke"><img src="https://img.shields.io/npm/dm/why-broke.svg?style=flat-square&color=green" alt="downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/Adi-gitX/why-this-broke"><img src="https://img.shields.io/github/stars/Adi-gitX/why-this-broke?style=flat-square" alt="stars"></a>
</p>

---

## 💔 The Problem

You've been here before:

```bash
$ git pull origin main
$ npm start
```

💥 **Build fails.**

But wait—**you didn't change anything.** Your colleague pushed the code. It works on their machine. The CI was green. So why is it broken on yours?

Traditional debugging tools tell you **where** things crashed:
```
Error: Cannot find module 'foo'
    at /your/code/index.js:42
```

**But they never tell you WHY.** The invisible forces at play are:

- 🕵️ A transitive dependency silently updated overnight
- 🔐 Your teammate added a new `.env` variable you don't have
- ⚡ You're running Node 18, but the team moved to Node 20
- 📜 Someone changed `tsconfig.json` and it broke everything

**`why-broke` makes these invisible problems visible.**

---

## 🎯 Why I Built This

As a developer, I got tired of the existential dread of debugging "phantom" build failures. The code didn't change. Git shows nothing. The error message is useless. But something, somewhere, shifted.

Traditional debugging assumes your bug is in **your code**. But modern JavaScript applications are complex ecosystems with:

- **200+ transitive dependencies** that update silently
- **Environment variables** scattered across `.env`, CI secrets, and team Notion docs
- **Toolchain configurations** (`tsconfig`, `webpack`, `vite`, `babel`) that are easy to break
- **Node.js version drift** across team members and CI

**`why-broke` is the first tool designed specifically for "it worked yesterday" debugging.** It captures a snapshot of your working environment and uses a **causal inference engine** to pinpoint exactly what changed when things break.

---

## ✨ Key Features

| Feature | Description |
|:--------|:------------|
| **📸 Intelligent Snapshotting** | Captures your runtime, dependencies, configs, and environment in one file |
| **🧠 Causal Inference Engine** | 6 specialized detectors that don't just diff—they **reason** about breakage |
| **🔮 Known Breaking Changes DB** | Recognizes common OSS migration issues (e.g., `node-fetch` CJS→ESM) |
| **🚀 Zero Config** | One command setup, runs silently in background |
| **📦 Package Manager Agnostic** | Works with npm, yarn, and pnpm |
| **🤖 CI/CD Native** | Designed for GitHub Actions, GitLab CI, and any pipeline |
| **🔒 Privacy First** | Only stores keys (never values) and file hashes (never content) |

---

## 📦 Installation

**Option A: Global Install (Great for Personal Use)**
```bash
npm install -g why-broke
```

**Option B: Project Dependency (Recommended for Teams)**
```bash
npm install --save-dev why-broke
# or
yarn add -D why-broke
# or
pnpm add -D why-broke
```

---

## 🚀 Quick Start

### 1. The Set-and-Forget Way (Recommended)

Run this once in your project:

```bash
npx why-broke init
```

<details>
<summary><strong>What does <code>init</code> do?</strong></summary>

- Adds a `postinstall` hook to your `package.json`
- Every `npm install` now automatically saves a baseline snapshot
- When builds fail, you always have a "known good" state to compare against

</details>

### 2. The Auto-Pilot Way (Wrap Any Command)

Wrap your build/test command and let `why-broke` watch it:

```bash
npx why-broke "npm run build"
# or
npx why-broke "npm test"
```

**What happens:**
- ✅ Command succeeds → Baseline silently updated
- ❌ Command fails → Instant root cause analysis

### 3. The Manual Way

```bash
# When things are working:
npx why-broke record

# When things break:
npx why-broke check
```

---

## 📸 What It Looks Like

When your build fails, `why-broke` produces a human-readable root cause analysis:

```
✖ Command failed. Diagnosing cause...

🔍 Causal Analysis:

FAILED due to dep-change

  ✅ It worked before because:
     • Version was 2.6.12
     • The ecosystem rules were different (e.g. CJS/ESM)

  ❌ It broke because:
     • Version is now 3.0.0
     • node-fetch: Switched from CommonJS to ESM-only. require() no longer works.

  💡 Logic:
     JavaScript did exactly what you asked. Your assumptions changed.

  🛠  Fix Strategy:
     Use dynamic import() or downgrade to v2.

Other potential issues:
[Dependency Integrity] Lockfile has changed. Underlying dependencies have drifted.
  └─ Fix: Run "npm ci" to restore exact versions.

[Environment] Missing variables: DATABASE_URL, API_KEY
  └─ Fix: Check your .env file or export these variables.
```

---

## 🧠 The Causal Inference Engine

This isn't a simple "diff" tool. `why-broke` uses a **probabilistic causal reasoning engine** with 6 specialized detectors:

| Detector | What It Checks | Confidence |
|:---------|:---------------|:-----------|
| **RuntimeDetector** | Node.js version, OS platform, CPU architecture | `HIGH` |
| **DependencyDetector** | Lockfile hash, package.json versions, removed packages | `HIGH` |
| **SemanticDependencyDetector** | Actual installed versions, semver boundary crossings, known breaking patterns | `HIGH` |
| **ConfigDetector** | Critical configs (`tsconfig`, `webpack`, `vite`, `babel`, `Dockerfile`, etc.) | `HIGH` |
| **EnvDetector** | Missing environment variable keys (not values!) | `HIGH` |
| **GitDetector** | Commit drift, uncommitted changes, branch context | `LOW` |

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     SNAPSHOTTING                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Runtime   │ │   Package   │ │   Configs   │               │
│  │  • Node.js  │ │  • deps     │ │  • tsconfig │               │
│  │  • Platform │ │  • lockfile │ │  • webpack  │               │
│  │  • Arch     │ │  • resolved │ │  • vite     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                          │                                      │
│                          ▼                                      │
│               .why-broke.json (baseline)                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │  Build Fails
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAUSAL INFERENCE ENGINE                       │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │  1. Capture current state                                │ │
│   │  2. Run 6 specialized detectors                          │ │
│   │  3. Build causal graph (nodes + edges)                   │ │
│   │  4. Score by confidence and impact                       │ │
│   │  5. Generate human-readable diagnosis                    │ │
│   └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Known Breaking Changes Database

`why-broke` includes a curated database of common breaking changes in popular packages:

| Package | Breaking Pattern | Reason |
|:--------|:-----------------|:-------|
| `node-fetch` | 2.x → 3.x | Switched from CommonJS to ESM-only |
| `uuid` | 3.x → 7.x | Default export removed, requires named imports |
| `uuid` | 7.x → 8.x | ESM transition |
| `axios` | 0.x → 1.x | Major API breaking changes |

More packages are added regularly. Contributions welcome!

---

## 🤖 CI/CD Integration

### GitHub Actions

```yaml
name: Build
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - run: npm ci
      
      # Wrap your build with why-broke
      - name: Build & Analyze
        run: npx why-broke "npm run build"
```

### GitLab CI

```yaml
build:
  script:
    - npm ci
    - npx why-broke "npm run build"
```

### Why Use It in CI?

- **"Works on my machine" debugging**: When CI fails but local works, the snapshot diff shows you the exact environment difference
- **Baseline tracking**: Every successful build updates the baseline for future comparisons
- **Faster debugging**: No more manually comparing Node versions, env vars, and dependencies

---

## 📁 Snapshot Contents

The `.why-broke.json` file contains:

```json
{
  "timestamp": 1704326400000,
  "runtime": {
    "nodeVersion": "v20.10.0",
    "npmVersion": "10.2.3",
    "arch": "arm64",
    "platform": "darwin"
  },
  "package": {
    "dependencies": { "axios": "^1.6.0" },
    "devDependencies": { "typescript": "^5.0.0" },
    "resolved": { "axios": { "version": "1.6.2" } },
    "scripts": { "build": "tsc" }
  },
  "lockfile": {
    "hash": "sha256:abc123...",
    "type": "npm"
  },
  "environment": {
    "keys": ["NODE_ENV", "DATABASE_URL", "API_KEY"]
  },
  "git": {
    "commit": "abc1234...",
    "branch": "main",
    "isDirty": false
  },
  "configurations": {
    "tsconfig.json": "sha256:def456...",
    "webpack.config.js": "sha256:ghi789..."
  }
}
```

**Privacy Note:** We only store environment variable **keys**, never values. Configuration files are stored as **hashes**, never content.

---

## ❓ FAQ

<details>
<summary><strong>Q: Where is the snapshot stored?</strong></summary>

In `.why-broke.json` in your project root.
</details>

<details>
<summary><strong>Q: Should I commit .why-broke.json?</strong></summary>

**No.** Add it to your `.gitignore`. This file represents your local machine's working state. Each developer and CI environment will have their own.
</details>

<details>
<summary><strong>Q: Does it read my source code?</strong></summary>

**No.** We only:
- Hash lockfiles and config files
- Read package.json for dependency versions
- Check environment variable **keys** (never values)

We never read, store, or transmit your actual source code.
</details>

<details>
<summary><strong>Q: Does it work with monorepos?</strong></summary>

Currently, `why-broke` operates at the project root level. Monorepo support with per-package snapshots is on the roadmap.
</details>

<details>
<summary><strong>Q: What package managers are supported?</strong></summary>

- ✅ npm
- ✅ yarn
- ✅ pnpm

Lockfiles for all three are automatically detected and hashed.
</details>

---

## 🛠 CLI Reference

| Command | Description |
|:--------|:------------|
| `why-broke init` | Set up automatic snapshot recording via postinstall hook |
| `why-broke record` | Manually save the current state as "known good" |
| `why-broke check` | Compare current state against saved baseline |
| `why-broke "<command>"` | Run a command with auto-record/check |
| `why-broke` | Show help |

---

## 🗺 Roadmap

- [ ] **Interactive TUI** - Visual diff browser for large projects
- [ ] **Monorepo support** - Per-package snapshots
- [ ] **Remote baseline sync** - Team-shared baselines for "works on my machine" debugging
- [ ] **VS Code Extension** - Inline causal annotations
- [ ] **Extended OSS database** - More known breaking changes

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# Clone the repo
git clone https://github.com/Adi-gitX/why-this-broke.git
cd why-this-broke

# Install dependencies
npm install

# Build
npm run build

# Test locally
node dist/cli.js --help
```

**Areas to contribute:**
- 🐛 Bug reports and fixes
- 📦 Add packages to the known breaking changes database
- 🧠 New detector implementations
- 📖 Documentation improvements

---

## 📜 License

[MIT](LICENSE) © [Aditya Kammati](https://github.com/Adi-gitX)

---

<p align="center">
  <strong>Built with frustration, shipped with love.</strong><br/>
  <em>Because "it worked yesterday" is not a debugging strategy.</em>
</p>

<p align="center">
  <a href="https://github.com/Adi-gitX/why-this-broke">⭐ Star on GitHub</a> •
  <a href="https://www.npmjs.com/package/why-broke">📦 View on npm</a> •
  <a href="https://github.com/Adi-gitX/why-this-broke/issues">🐛 Report Bug</a>
</p>
