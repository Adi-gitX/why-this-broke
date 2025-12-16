# 🕵️‍♀️ why-broke

**Stop guessing. Start reasoning.** A causal debugging tool that tells you *why* your build failed by comparing it to the last time it worked.

[![npm version](https://img.shields.io/npm/v/why-broke.svg)](https://www.npmjs.com/package/why-broke)

---

### The Problem
You pull the latest code. You run `npm start`. It crashes.  
The error says `undefined is not a function`.  
**But it worked yesterday.**

Standard tools show you the **Trace** (where it crashed).  
`why-broke` shows you the **Cause** (what changed since it last worked).

### The Solution
`why-broke` takes a snapshot of your "World A" (Working State) and compares it to "World B" (Broken State) to detect:
* ❌ **Dependency Drift** (Did a minor patch update break you?)
* ❌ **Environment Gaps** (Did you forget a new `.env` variable?)
* ❌ **Runtime Shifts** (Did your Node version silently jump?)

---

### 🚀 Usage

**1. Install**
```bash
npm install -g why-broke
```

**2. The "It Works" Moment**
When your app is working, tell the system to remember this state.

```bash
why-broke record
```

*Tip: Add this to your `postbuild` script!*

**3. The "It Broke" Moment**
When things crash, ask the system why.

```bash
why-broke check
```

**Output:**

```text
[Dependency Drift] axios changed version: ^0.21.1 -> ^0.22.0
  └─ Fix: Revert axios to ^0.21.1 or check changelogs.

[Environment] Missing Environment Variables: STRIPE_SECRET_KEY
  └─ Fix: Check your .env file or export these variables.
```

---

### 🧠 How It Works
Every bug has three layers:

1. **Trigger:** The error message (what you see).
2. **Cause:** The specific delta (what changed).
3. **Reason:** Why that change mattered.

`why-broke` focuses entirely on layer 2. It tracks the "Metadata of Success" so that when failure happens, it can diff the reality of your system, not just your code.

### License
MIT
