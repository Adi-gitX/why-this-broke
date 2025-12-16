import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';

export interface SystemState {
    timestamp: number;
    nodeVersion: string;
    dependencies: Record<string, string>;
    lockfileHash: string;
    envKeys: string[];
    gitCommit: string;
}

const getLockfileHash = (): string => {
    const files = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    for (const file of files) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file);
            return crypto.createHash('sha256').update(content).digest('hex');
        }
    }
    return 'none';
};

export const captureState = (): SystemState => {
    let pkg: any = {};
    try {
        if (fs.existsSync('package.json')) {
            pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        }
    } catch (e) { }

    let gitCommit = 'unknown';
    try {
        gitCommit = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
    } catch (e) { }

    return {
        timestamp: Date.now(),
        nodeVersion: process.version,
        dependencies: pkg.dependencies || {},
        lockfileHash: getLockfileHash(),
        envKeys: Object.keys(process.env).sort(),
        gitCommit
    };
};

export const saveSnapshot = (path: string = '.why-broke.json') => {
    const state = captureState();
    fs.writeFileSync(path, JSON.stringify(state, null, 2));
};
