import fs from 'fs';
import { execSync } from 'child_process';
import { captureState, SystemState } from './snapshot';

export interface DiffResult {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    category: string;
    message: string;
    remedy: string;
}

export const analyzeFailure = (snapshotPath: string = '.why-broke.json'): DiffResult[] => {
    if (!fs.existsSync(snapshotPath)) {
        return [{
            type: 'INFO',
            category: 'First Run',
            message: 'No previous success state found.',
            remedy: 'Run "why-broke record" when your build is working.'
        }];
    }

    const oldState: SystemState = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    const newState = captureState();
    const results: DiffResult[] = [];

    if (oldState.nodeVersion !== newState.nodeVersion) {
        results.push({
            type: 'CRITICAL',
            category: 'Runtime Drift',
            message: `Node version changed from ${oldState.nodeVersion} to ${newState.nodeVersion}`,
            remedy: `Switch back to ${oldState.nodeVersion} using nvm or nodenv.`
        });
    }

    if (oldState.lockfileHash !== newState.lockfileHash) {
        results.push({
            type: 'CRITICAL',
            category: 'Dependency Integrity',
            message: 'Lockfile has changed. Underlying dependencies have drifted.',
            remedy: 'Run "npm ci" or "yarn install --frozen-lockfile" to restore exact versions.'
        });
    }

    const oldDeps = oldState.dependencies;
    const newDeps = newState.dependencies;
    Object.keys(newDeps).forEach(dep => {
        if (oldDeps[dep] && oldDeps[dep] !== newDeps[dep]) {
            results.push({
                type: 'WARNING',
                category: 'Dependency Definition',
                message: `${dep} changed in package.json: ${oldDeps[dep]} -> ${newDeps[dep]}`,
                remedy: `Revert ${dep} to ${oldDeps[dep]} or check changelogs.`
            });
        }
    });

    const missingEnv = oldState.envKeys.filter(k => !newState.envKeys.includes(k));
    if (missingEnv.length > 0) {
        results.push({
            type: 'CRITICAL',
            category: 'Environment',
            message: `Missing variables: ${missingEnv.join(', ')}`,
            remedy: 'Check your .env file or export these variables.'
        });
    }

    if (oldState.gitCommit !== newState.gitCommit) {
        try {
            const fileCount = execSync(`git diff --name-only ${oldState.gitCommit} HEAD`, { stdio: 'pipe' }).toString().trim().split('\n').filter(Boolean).length;
            if (fileCount > 0) {
                results.push({
                    type: 'INFO',
                    category: 'Code Changes',
                    message: `${fileCount} files modified since last success (${oldState.gitCommit.substring(0, 7)}).`,
                    remedy: 'Review your recent git history.'
                });
            }
        } catch (e) {
            results.push({
                type: 'INFO',
                category: 'Git History',
                message: 'Commit hash changed, but could not calculate diff.',
                remedy: 'Check git log.'
            });
        }
    }

    return results;
};
