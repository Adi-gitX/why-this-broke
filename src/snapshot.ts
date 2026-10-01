import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { SystemState, ResolvedDependency } from './internal/types';

const getLockfileInfo = (): { hash: string; type: SystemState['lockfile']['type'] } => {
    if (fs.existsSync('package-lock.json')) {
        return {
            hash: crypto.createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex'),
            type: 'npm'
        };
    }
    if (fs.existsSync('yarn.lock')) {
        return {
            hash: crypto.createHash('sha256').update(fs.readFileSync('yarn.lock')).digest('hex'),
            type: 'yarn'
        };
    }
    if (fs.existsSync('pnpm-lock.yaml')) {
        return {
            hash: crypto.createHash('sha256').update(fs.readFileSync('pnpm-lock.yaml')).digest('hex'),
            type: 'pnpm'
        };
    }
    return { hash: 'none', type: 'none' };
};

const getGitInfo = (): SystemState['git'] => {
    try {
        const commit = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
        // check if dirty
        const status = execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim();
        return { commit, branch, isDirty: status.length > 0 };
    } catch (e) {
        return { commit: 'unknown', branch: 'unknown', isDirty: false };
    }
};

const getNpmVersion = (): string | undefined => {
    try {
        return execSync('npm -v', { stdio: 'pipe' }).toString().trim();
    } catch { return undefined; }
};

const getConfigHashes = (): Record<string, string> => {
    const criticalFiles = [
        'tsconfig.json',
        'jsconfig.json',
        'webpack.config.js',
        'vite.config.js',
        'babel.config.js',
        '.eslintrc',
        '.eslintrc.json',
        '.prettierrc',
        'Dockerfile',
        'docker-compose.yml',
        'next.config.js',
        'tailwind.config.js'
    ];

    const hashes: Record<string, string> = {};
    for (const file of criticalFiles) {
        if (fs.existsSync(file)) {
            try {
                hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
            } catch (e) { }
        }
    }
    return hashes;
};

// Helper to get resolved dependencies using npm list
// We use npm list --json --depth=0 to get top-level resolved versions
const getResolvedDependencies = (): Record<string, ResolvedDependency> => {
    try {
        const output = execSync('npm list --json --depth=0', { stdio: 'pipe' }).toString();
        const parsed = JSON.parse(output);
        const resolved: Record<string, ResolvedDependency> = {};

        if (parsed.dependencies) {
            for (const [name, info] of Object.entries(parsed.dependencies) as [string, any][]) {
                resolved[name] = {
                    version: info.version || 'unknown',
                    resolved: info.resolved,
                    type: 'unknown'
                };
            }
        }
        return resolved;
    } catch (e) {
        return {};
    }
};

export const captureState = (cmdContext?: { command: string, cwd: string }): SystemState => {
    let pkg: any = {};
    try {
        if (fs.existsSync('package.json')) {
            pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        }
    } catch (e) { }

    return {
        timestamp: Date.now(),
        runtime: {
            nodeVersion: process.version,
            npmVersion: getNpmVersion(),
            arch: process.arch,
            platform: process.platform
        },
        package: {
            dependencies: pkg.dependencies || {},
            devDependencies: pkg.devDependencies || {},
            resolved: getResolvedDependencies(),
            scripts: pkg.scripts || {}
        },
        lockfile: getLockfileInfo(),
        environment: {
            keys: Object.keys(process.env)
                .filter(k => {
                    if (k.startsWith('npm_')) return false;
                    if (k === '_') return false;
                    const noise = ['INIT_CWD', 'NODE', 'NODE_PATH', 'COLOR', 'EDITOR', 'SHLVL', 'TERM_PROGRAM', 'TERM_PROGRAM_VERSION'];
                    return !noise.includes(k);
                })
                .sort()
        },
        git: getGitInfo(),
        configurations: getConfigHashes(),
        execution: cmdContext ? {
            command: cmdContext.command,
            cwd: cmdContext.cwd
        } : undefined
    };
};

export const saveSnapshot = (path: string = '.why-broke.json', cmdContext?: { command: string, cwd: string }) => {
    const state = captureState(cmdContext);
    fs.writeFileSync(path, JSON.stringify(state, null, 2));
};
