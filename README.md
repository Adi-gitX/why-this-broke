# 🦅 why-broke

**It worked yesterday. Why not today?**

[![npm version](https://img.shields.io/npm/v/why-broke.svg)](https://www.npmjs.com/package/why-broke)

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

### 🚀 Usage

#### 1. The Easy Way (Auto-Pilot)
Just run your command with `npx why-broke`.

```bash
npx why-broke "npm run build"
```
*   **If it works:** We save the "Good State".
*   **If it fails:** We tell you exactly what changed.

#### 2. The Smart Way (Set & Forget)
Run this once in your project:

```bash
npx why-broke init
```
Now, every time you install packages, we automatically save the "Good State". You never have to think about it.

#### 3. The Manual Way
You can always control it yourself:

```bash
why-broke record   # Save "It works!"
why-broke check    # Ask "What's wrong?"
```

---

### 🧠 Confidence Engine

We don't just dump a diff. We rank findings by probability.

| Signal | Meaning | Confidence |
| :--- | :--- | :--- |
| **Runtime / Lockfile** | Your execution environment changed. | `HIGH` |
| **Missing Dep** | A package disappeared. | `HIGH` |
| **Package Update** | `package.json` version bump. | `MEDIUM` |
| **Code Change** | Git files modified. | `LOW` |

---

### 🛡 Zero-Knowledge

**How we record:**
We verify your state using **checksums** and **key-names**.
*   We do NOT read your source code.
*   We do NOT read your env values.

### License
MIT
