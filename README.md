# 🕵️‍♀️ why-broke

**Stop guessing. Start reasoning.** A causal debugging tool that compares your broken build to the last time it worked.

[![npm version](https://img.shields.io/npm/v/why-broke.svg)](https://www.npmjs.com/package/why-broke)

---

### The Problem
You pull the latest code. You run `npm start`. It crashes.  
**But it worked yesterday.**

Standard tools show you the **Trace** (where it crashed).  
`why-broke` shows you the **Cause** (what changed since then).

*Especially useful when CI fails but it works locally.*

### The Solution
`why-broke` takes a lightweight snapshot of your "World A" (Working State) and compares it to "World B" (Broken State) to detect:
* ❌ **Dependency Drift** (Did a minor patch update break you?)
* ❌ **Environment Gaps** (Did you forget a new `.env` variable?)
* ❌ **Runtime Shifts** (Did your Node version silently jump?)

---

### 🚀 Usage

**The Magic Way (Recommended)**
Simply wrap your build command. Auto-Pilot handles the rest.

```bash
npx why-broke "npm run build"
```
*   **Success?** It automatically records the new baseline.
*   **Failure?** It automatically detects drift and warns you.

**The "Set and Forget" way**
Run `npx why-broke init` to automatically track baselines on every `npm install`.

---

### 🧐 Scope & Guarantees (v1)

**What it guarantees:**
*   ✅ Detects drift in **Dependencies**, **Environment**, and **Node Version**.
*   ✅ Hashes your **Lockfile** to find silent sub-dependency changes.
*   ✅ Never guesses silently — all findings are traceable.

**What it does NOT do (yet):**
*   ❌ Full semantic code analysis (AST parsing).
*   ❌ Automatic code fixing.

---

### 🧠 Confidence Model

`why-broke` doesn't just guess. It ranks findings by **Confidence**:

*   **HIGH**: Runtime/Lockfile/Env changes. These almost always cause breakages in previously working builds.
*   **MEDIUM**: `package.json` updates.
*   **LOW**: Git file changes. We know *files* changed, but we verify drift first.

### 🛡 Privacy & Security

**How World A is captured:**
We only store **hashes** and **fingerprints** (e.g., checksum of `package-lock.json`, list of env *keys*).
We **never** store source code or environment values.

### License
MIT
