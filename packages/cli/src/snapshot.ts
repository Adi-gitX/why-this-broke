import fs from 'fs';
import { execSync } from 'child_process';

export interface SystemState {
    timestamp: number;
    nodeVersion: string;
    dependencies: Record<string, string>;
    envKeys: string[];
    gitCommit: string;
}

export const captureState = (): SystemState => {
    let pkg: any = {};
    try {
        pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    } catch (e) {
        // no package.json
    }

    let gitCommit = 'unknown';
    try {
        gitCommit = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
    } catch (e) { }

    return {
        timestamp: Date.now(),
        nodeVersion: process.version,
        dependencies: pkg.dependencies || {},
        envKeys: Object.keys(process.env).sort(),
        gitCommit
    };
};

export const saveSnapshot = (path: string = '.why-broke.json') => {
    const state = captureState();
    fs.writeFileSync(path, JSON.stringify(state, null, 2));
};
