import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { SystemState } from './internal/types';

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

export const captureState = (): SystemState => {
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
            scripts: pkg.scripts || {}
        },
        lockfile: getLockfileInfo(),
        environment: {
            keys: Object.keys(process.env)
                .filter(k => !k.startsWith('npm_') && k !== '_') // Filter volatile
                .sort()
        },
        git: getGitInfo()
    };
};

export const saveSnapshot = (path: string = '.why-broke.json') => {
    const state = captureState();
    fs.writeFileSync(path, JSON.stringify(state, null, 2));
};
