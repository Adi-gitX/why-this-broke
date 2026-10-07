import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { SystemState, ResolvedDependency, ExecutionContext } from './internal/types';

export const DEFAULT_SNAPSHOT_PATH = '.why-broke.json';

/** Files whose contents are hashed into the snapshot. Only the hash is stored. */
export const CONFIG_FILES = [
    'tsconfig.json',
    'tsconfig.build.json',
    'jsconfig.json',
    '.babelrc',
    'babel.config.js',
    'babel.config.json',
    'webpack.config.js',
    'webpack.config.ts',
    'vite.config.js',
    'vite.config.ts',
    'vite.config.mjs',
    'vitest.config.ts',
    'jest.config.js',
    'jest.config.ts',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'nuxt.config.ts',
    'svelte.config.js',
    'astro.config.mjs',
    'tailwind.config.js',
    'tailwind.config.ts',
    'postcss.config.js',
    'postcss.config.mjs',
    'postcss.config.cjs',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.cjs',
    'eslint.config.js',
    'eslint.config.mjs',
    '.prettierrc',
    '.prettierrc.json',
    'prettier.config.js',
    '.npmrc',
    '.nvmrc',
    '.node-version',
    '.tool-versions',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml'
];

/**
 * Environment variables that differ between shells, terminals and editors
 * without affecting a build. They are excluded so that opening a different
 * terminal does not look like drift.
 */
const ENV_IGNORED = new Set([
    '_', 'PWD', 'OLDPWD', 'SHLVL', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'PATH',
    'TMPDIR', 'TMP', 'TEMP', 'TERM', 'COLORTERM', 'COLOR', 'EDITOR', 'VISUAL',
    'PAGER', 'LESS', 'LANG', 'LANGUAGE', 'DISPLAY', 'HOSTNAME', 'INIT_CWD',
    'NODE', 'NODE_PATH', 'MANPATH', 'INFOPATH', 'COMMAND_MODE', 'SECURITYSESSIONID',
    'LS_COLORS', 'LSCOLORS', 'ZDOTDIR', 'ZSH', 'TMUX', 'TMUX_PANE', 'STY', 'WINDOWID',
    'SESSION_MANAGER', 'TERMINAL_EMULATOR', 'WSLENV', 'CI', 'SYSTEMROOT', 'COMSPEC',
    'WINDIR', 'PROGRAMFILES', 'PROGRAMDATA', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE',
    'USERNAME', 'USERDOMAIN', 'COMPUTERNAME', 'PATHEXT', 'PROMPT', 'PSMODULEPATH'
]);

const ENV_IGNORED_PREFIXES = [
    'npm_', 'TERM_', 'ITERM_', 'VSCODE_', 'CURSOR_', 'JETBRAINS_', 'IDEA_', 'WARP_',
    'KITTY_', 'ALACRITTY_', 'WEZTERM_', 'GHOSTTY_', 'LC_', 'SSH_', 'XDG_', 'XPC_',
    '__CF', 'APPLE_', 'HOMEBREW_', 'NVM_', 'FNM_', 'VOLTA_', 'CONDA_', 'GNOME_',
    'KDE_', 'DBUS_', 'WSL_', 'GITHUB_', 'RUNNER_', 'GITLAB_', 'CI_', 'CLAUDE'
];

const isNoiseEnvKey = (key: string): boolean => {
    const upper = key.toUpperCase();
    if (ENV_IGNORED.has(upper)) return true;
    return ENV_IGNORED_PREFIXES.some(prefix => upper.startsWith(prefix.toUpperCase()));
};

const sha256 = (buf: Buffer): string => crypto.createHash('sha256').update(buf).digest('hex');

const hashFile = (file: string): string | undefined => {
    try {
        return sha256(fs.readFileSync(file));
    } catch {
        return undefined;
    }
};

const readJson = (file: string): any | undefined => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        return undefined;
    }
};

const runQuiet = (cmd: string, cwd: string): string | undefined => {
    try {
        return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        return undefined;
    }
};

const LOCKFILES: Array<{ file: string; type: SystemState['lockfile']['type'] }> = [
    { file: 'package-lock.json', type: 'npm' },
    { file: 'npm-shrinkwrap.json', type: 'npm' },
    { file: 'yarn.lock', type: 'yarn' },
    { file: 'pnpm-lock.yaml', type: 'pnpm' },
    { file: 'bun.lockb', type: 'bun' },
    { file: 'bun.lock', type: 'bun' }
];

const getLockfileInfo = (cwd: string): SystemState['lockfile'] => {
    for (const { file, type } of LOCKFILES) {
        const hash = hashFile(path.join(cwd, file));
        if (hash) return { hash, type };
    }
    return { hash: 'none', type: 'none' };
};

const getGitInfo = (cwd: string): SystemState['git'] => {
    const commit = runQuiet('git rev-parse HEAD', cwd);
    if (!commit) return { commit: 'unknown', branch: 'unknown', isDirty: false };
    const branch = runQuiet('git rev-parse --abbrev-ref HEAD', cwd) || 'unknown';
    const status = runQuiet('git status --porcelain', cwd) || '';
    return { commit, branch, isDirty: status.length > 0 };
};

const getConfigHashes = (cwd: string): Record<string, string> => {
    const hashes: Record<string, string> = {};
    for (const file of CONFIG_FILES) {
        const hash = hashFile(path.join(cwd, file));
        if (hash) hashes[file] = hash;
    }
    return hashes;
};

/**
 * Reads the version of every declared dependency straight from node_modules.
 * This works for npm, yarn, pnpm and bun, and does not fail when the tree has
 * peer-dependency warnings (which makes `npm ls` exit non-zero).
 */
const getResolvedDependencies = (cwd: string, pkg: any): Record<string, ResolvedDependency> => {
    const names = new Set<string>([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
        ...Object.keys(pkg.optionalDependencies || {})
    ]);

    const resolved: Record<string, ResolvedDependency> = {};
    for (const name of names) {
        const manifest = readJson(path.join(cwd, 'node_modules', name, 'package.json'));
        if (!manifest || typeof manifest.version !== 'string') continue;
        resolved[name] = {
            version: manifest.version,
            resolved: typeof manifest._resolved === 'string' ? manifest._resolved : undefined,
            type: manifest.type === 'module' ? 'module' : 'commonjs'
        };
    }
    return resolved;
};

/** Extracts variable names (never values) from a dotenv-style file. */
export const parseEnvFileKeys = (file: string): string[] => {
    let content: string;
    try {
        content = fs.readFileSync(file, 'utf-8');
    } catch {
        return [];
    }
    const keys: string[] = [];
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match) keys.push(match[1]);
    }
    return keys;
};

const ENV_FILES = ['.env', '.env.local'];
const ENV_EXAMPLE_FILES = ['.env.example', '.env.sample', '.env.template'];

const getEnvironment = (cwd: string): SystemState['environment'] => {
    const keys = new Set<string>();
    for (const key of Object.keys(process.env)) {
        if (!isNoiseEnvKey(key)) keys.add(key);
    }
    for (const file of ENV_FILES) {
        for (const key of parseEnvFileKeys(path.join(cwd, file))) keys.add(key);
    }

    const declared = new Set<string>();
    for (const file of ENV_EXAMPLE_FILES) {
        for (const key of parseEnvFileKeys(path.join(cwd, file))) declared.add(key);
    }

    const environment: SystemState['environment'] = { keys: [...keys].sort() };
    if (declared.size > 0) environment.declared = [...declared].sort();
    return environment;
};

const getNpmVersion = (cwd: string): string | undefined => runQuiet('npm -v', cwd);

export interface CaptureOptions {
    command?: string;
    cwd?: string;
}

/** Captures the current state of the project in the working directory. */
export const captureState = (options: CaptureOptions = {}): SystemState => {
    const cwd = options.cwd || process.cwd();
    const pkg = readJson(path.join(cwd, 'package.json')) || {};

    const execution: ExecutionContext | undefined = options.command
        ? { command: options.command, cwd }
        : undefined;

    return {
        timestamp: Date.now(),
        runtime: {
            nodeVersion: process.version,
            npmVersion: getNpmVersion(cwd),
            arch: process.arch,
            platform: process.platform
        },
        package: {
            dependencies: pkg.dependencies || {},
            devDependencies: pkg.devDependencies || {},
            resolved: getResolvedDependencies(cwd, pkg),
            scripts: pkg.scripts || {}
        },
        lockfile: getLockfileInfo(cwd),
        environment: getEnvironment(cwd),
        git: getGitInfo(cwd),
        configurations: getConfigHashes(cwd),
        execution
    };
};

/** Captures the current state and writes it to the snapshot file. Returns the state written. */
export const saveSnapshot = (snapshotPath: string = DEFAULT_SNAPSHOT_PATH, options: CaptureOptions = {}): SystemState => {
    const state = captureState(options);
    fs.writeFileSync(snapshotPath, JSON.stringify(state, null, 2) + '\n');
    return state;
};

export type SnapshotReadResult =
    | { ok: true; state: SystemState }
    | { ok: false; reason: 'missing' | 'corrupt' | 'legacy' };

/** Reads a snapshot file and validates that it is usable by this version. */
export const readSnapshot = (snapshotPath: string = DEFAULT_SNAPSHOT_PATH): SnapshotReadResult => {
    if (!fs.existsSync(snapshotPath)) return { ok: false, reason: 'missing' };
    const raw = readJson(snapshotPath);
    if (!raw || typeof raw !== 'object') return { ok: false, reason: 'corrupt' };
    if (!raw.runtime || !raw.runtime.nodeVersion || !raw.package || !raw.lockfile || !raw.environment) {
        return { ok: false, reason: 'legacy' };
    }
    return { ok: true, state: raw as SystemState };
};
