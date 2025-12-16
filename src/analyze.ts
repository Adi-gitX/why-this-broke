import fs from 'fs';
import { execSync } from 'child_process';
import { captureState, SystemState } from './snapshot';

export interface DiffResult {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    message: string;
    remedy: string;
}

export const analyzeFailure = (snapshotPath: string = '.why-broke.json'): DiffResult[] => {
    if (!fs.existsSync(snapshotPath)) {
        return [{
            type: 'INFO',
            confidence: 'LOW',
            category: 'First Run',
            message: 'No previous success state found to compare against.',
            remedy: 'Run "why-broke record" when your build is working.'
        }];
    }

    const oldState: SystemState = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    const newState = captureState();
    const results: DiffResult[] = [];

    if (oldState.nodeVersion !== newState.nodeVersion) {
        results.push({
            type: 'CRITICAL',
            confidence: 'HIGH',
            category: 'Runtime Drift',
            message: `Node version changed from ${oldState.nodeVersion} to ${newState.nodeVersion}`,
            remedy: `Switch back to ${oldState.nodeVersion} using nvm or nodenv.`
        });
    }

    if (oldState.lockfileHash !== newState.lockfileHash) {
        results.push({
            type: 'CRITICAL',
            confidence: 'HIGH',
            category: 'Dependency Integrity',
            message: 'Lockfile has changed. Underlying dependencies have drifted.',
            remedy: 'Run "npm ci" or "yarn install --frozen-lockfile" to restore exact versions.'
        });
    }

    const oldDeps = oldState.dependencies;
    const newDeps = newState.dependencies;

    // Check for Version Changes & New Deps (implicit in package.json usually, but good to check)
    Object.keys(newDeps).forEach(dep => {
        if (oldDeps[dep] && oldDeps[dep] !== newDeps[dep]) {
            results.push({
                type: 'WARNING',
                confidence: 'MEDIUM',
                category: 'Dependency Definition',
                message: `${dep} changed in package.json: ${oldDeps[dep]} -> ${newDeps[dep]}`,
                remedy: `Revert ${dep} to ${oldDeps[dep]} or check changelogs.`
            });
        }
    });

    // Check for REMOVED dependencies
    Object.keys(oldDeps).forEach(dep => {
        if (!newDeps[dep]) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Dependency Missing',
                message: `${dep} was removed from package.json (prev: ${oldDeps[dep]})`,
                remedy: `Re-install ${dep} or check if it was accidentally deleted.`
            });
        }
    });

    const missingEnv = oldState.envKeys.filter(k => !newState.envKeys.includes(k));
    if (missingEnv.length > 0) {
        results.push({
            type: 'CRITICAL',
            confidence: 'HIGH',
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
                    confidence: 'LOW',
                    category: 'Code Changes',
                    message: `${fileCount} files modified since last success (${oldState.gitCommit.substring(0, 7)}).`,
                    remedy: 'Review your recent git history.'
                });
            }
        } catch (e) {
            results.push({
                type: 'INFO',
                confidence: 'LOW',
                category: 'Git History',
                message: 'Commit hash changed, but could not calculate diff.',
                remedy: 'Check git log.'
            });
        }
    }

    return results.sort((a, b) => {
        const score = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return score[b.confidence] - score[a.confidence];
    });
};
