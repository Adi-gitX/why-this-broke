import fs from 'fs';
import { captureState, SystemState } from './snapshot';

interface DiffResult {
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
            remedy: 'Run your build successfully once to establish a baseline.'
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

    const oldDeps = oldState.dependencies;
    const newDeps = newState.dependencies;

    Object.keys(newDeps).forEach(dep => {
        if (oldDeps[dep] && oldDeps[dep] !== newDeps[dep]) {
            results.push({
                type: 'CRITICAL',
                category: 'Dependency Drift',
                message: `${dep} changed version: ${oldDeps[dep]} -> ${newDeps[dep]}`,
                remedy: `Revert ${dep} to ${oldDeps[dep]} or check changelogs.`
            });
        }
    });

    const missingEnv = oldState.envKeys.filter(k => !newState.envKeys.includes(k));
    if (missingEnv.length > 0) {
        results.push({
            type: 'CRITICAL',
            category: 'Environment',
            message: `Missing Environment Variables: ${missingEnv.join(', ')}`,
            remedy: 'Check your .env file or export these variables.'
        });
    }

    return results;
};
