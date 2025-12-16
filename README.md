# 🦅 why-broke

**It worked yesterday. Why not today?**

[![npm version](https://img.shields.io/npm/v/why-broke.svg)](https://www.npmjs.com/package/why-broke)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

### The Problem
You pull the code. You run `npm start`. It crashes.
**You didn't change anything.** So why is it broken?

Standard tools show **Where** it crashed (Stack Trace).
`why-broke` shows **Why** it crashed (What changed).

### The Solution
We take a tiny snapshot of your system when it works. When it breaks, we compare the difference.

We instantly spot the invisible things that Git misses:
* 📦 **Silent Updates**: A dependency upgraded and broke you.
* 🔐 **Missing Info**: You forgot a new `.env` key.
* ⚡ **Wrong Tools**: You are running Node 18, but the team switched to 20.

---

### � Installation

**Option A: Global (Good for local dev)**
```bash
npm install -g why-broke
```

**Option B: Dev Dependency (Best for Teams/CI)**
```bash
npm install --save-dev why-broke
```

---

### �🚀 Usage

#### 1. The Easy Way (Auto-Pilot)
Wrap your build command. We watch it for you.

```bash
npx why-broke "npm run build"
```
*   **Success?** We save the "Good State" silently.
*   **Failure?** We wake up and tell you what changed.

#### 2. The Smart Way (Set & Forget)
Run this once in your project root:

```bash
npx why-broke init
```
Now, every time you run `npm install`, we automatically save the "Good State" in the background.

#### 3. Manual Control
```bash
why-broke record   # "This works!"
why-broke check    # "Whoops, it's broken."
```

---

### 📸 What it looks like

When your build fails, `why-broke` gives you a clear root cause analysis:

```text
✖ Command failed. Diagnosing cause...

 HIGH  [Runtime Drift]
       Node version changed from v18.16.0 to v20.2.0
       └─ Fix: Switch back to v18.16.0 using nvm.

 HIGH  [Dependency Integrity]
       Lockfile has changed. Underlying dependencies have drifted.
       └─ Fix: Run "npm ci" to restore exact versions.

 MED   [Dependency Definition]
       axios changed in package.json: ^1.4.0 -> ^1.5.0
       └─ Fix: Revert axios to ^1.4.0 or check changelogs.
```

---

### 🤖 CI/CD Integration

Use `why-broke` in GitHub Actions to debug "It works strictly on my machine" issues.

**example-workflow.yml**
```yaml
steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-node@v3
  
  # Run your build with Auto-Pilot
  - name: Build & Analyze
    run: npx why-broke "npm run build"
```

If the build passes, we record the baseline. If it fails later, we tell you why.

---

### ❓ FAQ

**Q: Where is the snapshot stored?**
A: In a file called `.why-broke.json` in your project root.

**Q: Should I commit .why-broke.json?**
A: **No.** Add it to your `.gitignore`. This file represents *your local machine's* working state.

**Q: Does it read my source code?**
A: **No.** We only hash `package-lock.json` and check `process.env` keys. We never read or store your actual code or secrets.

---

### 🧠 Confidence Engine

We don't just dump a diff. We rank findings by probability.

| Signal | Meaning | Confidence |
| :--- | :--- | :--- |
| **Runtime / Lockfile** | Your execution environment changed. | `HIGH` |
| **Missing Dep** | A package disappeared. | `HIGH` |
| **Package Update** | `package.json` version bump. | `MEDIUM` |
| **Code Change** | Git files modified. | `LOW` |

### License
MIT
