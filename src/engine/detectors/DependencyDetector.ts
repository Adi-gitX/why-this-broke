import { Detector, SystemState, DiffResult } from '../../internal/types';

const INSTALL_COMMAND: Record<SystemState['lockfile']['type'], string> = {
    npm: 'npm ci',
    yarn: 'yarn install --frozen-lockfile',
    pnpm: 'pnpm install --frozen-lockfile',
    bun: 'bun install --frozen-lockfile',
    none: 'npm install'
};

/** Compares what package.json declares and whether it is actually installed. */
export class DependencyDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];

        // 1. Declared but not installed. The most common "it worked yesterday" cause after a git pull.
        const declaredNow = { ...newState.package.dependencies, ...newState.package.devDependencies };
        const installed = newState.package.resolved || {};
        const declaredNames = Object.keys(declaredNow);
        const notInstalled = declaredNames.filter(name => !installed[name]);

        if (declaredNames.length > 0 && notInstalled.length === declaredNames.length) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Dependencies',
                title: 'node_modules is missing',
                message: 'None of the declared dependencies are installed.',
                remedy: `Run ${INSTALL_COMMAND[newState.lockfile.type]}.`
            });
        } else if (notInstalled.length > 0) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Dependencies',
                title: `${notInstalled.length} declared package${notInstalled.length === 1 ? '' : 's'} not installed`,
                message: `In package.json but not in node_modules: ${notInstalled.join(', ')}.`,
                remedy: `Run ${INSTALL_COMMAND[newState.lockfile.type]}.`
            });
        }

        // 2. Package manager switched.
        if (oldState.lockfile.type !== 'none' && newState.lockfile.type !== 'none' && oldState.lockfile.type !== newState.lockfile.type) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Dependencies',
                title: `Lockfile switched from ${oldState.lockfile.type} to ${newState.lockfile.type}`,
                message: 'The project changed package manager. node_modules installed by the previous one may not match.',
                remedy: `Delete node_modules and run ${INSTALL_COMMAND[newState.lockfile.type]}.`
            });
        } else if (oldState.lockfile.hash !== newState.lockfile.hash) {
            results.push({
                type: 'WARNING',
                confidence: 'MEDIUM',
                category: 'Dependencies',
                title: 'Lockfile changed',
                message: 'The lockfile differs from the baseline, so transitive dependencies may have moved even where package.json did not.',
                remedy: `Run ${INSTALL_COMMAND[newState.lockfile.type]} to install exactly what the lockfile says.`
            });
        }

        // 3. package.json ranges.
        const oldDeps = { ...oldState.package.dependencies, ...oldState.package.devDependencies };

        for (const name of Object.keys(declaredNow)) {
            if (!oldDeps[name]) {
                results.push({
                    type: 'INFO',
                    confidence: 'LOW',
                    category: 'Dependencies',
                    title: `${name} added to package.json`,
                    message: `${name}@${declaredNow[name]} was not a dependency when the baseline was recorded.`,
                    remedy: 'Expected if someone added it on purpose. Make sure it is installed.'
                });
            } else if (oldDeps[name] !== declaredNow[name]) {
                results.push({
                    type: 'WARNING',
                    confidence: 'MEDIUM',
                    category: 'Dependencies',
                    title: `${name} range changed in package.json`,
                    message: `${oldDeps[name]} -> ${declaredNow[name]}.`,
                    remedy: `Revert to ${oldDeps[name]} to confirm, or read the ${name} changelog.`
                });
            }
        }

        for (const name of Object.keys(oldDeps)) {
            if (!declaredNow[name]) {
                results.push({
                    type: 'CRITICAL',
                    confidence: 'HIGH',
                    category: 'Dependencies',
                    title: `${name} removed from package.json`,
                    message: `${name}@${oldDeps[name]} was a dependency when the baseline was recorded and is not any more.`,
                    remedy: `Re-add it with npm install ${name}@${oldDeps[name].replace(/^[\^~]/, '')} if code still imports it.`
                });
            }
        }

        return results;
    }
}
