import { Detector, SystemState, DiffResult } from '../../internal/types';

export class DependencyDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];

        // 1. Lockfile Integrity
        if (oldState.lockfile.hash !== newState.lockfile.hash) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Dependency Integrity',
                message: 'Lockfile has changed. Underlying dependencies have drifted.',
                remedy: 'Run "npm ci" or "yarn install --frozen-lockfile" to restore exact versions.'
            });
        }

        // 2. Package.json Definitions
        const oldDeps = { ...oldState.package.dependencies, ...oldState.package.devDependencies };
        const newDeps = { ...newState.package.dependencies, ...newState.package.devDependencies };

        // Changed Versions
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

        // Removed Dependencies
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

        return results;
    }
}
