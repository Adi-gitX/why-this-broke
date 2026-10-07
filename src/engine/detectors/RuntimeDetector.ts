import { Detector, SystemState, DiffResult } from '../../internal/types';
import { parseVersion } from '../semver';

export class RuntimeDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        const prev = oldState.runtime;
        const curr = newState.runtime;

        if (prev.nodeVersion !== curr.nodeVersion) {
            const a = parseVersion(prev.nodeVersion);
            const b = parseVersion(curr.nodeVersion);
            const majorChanged = !a || !b || a.major !== b.major;
            results.push({
                type: majorChanged ? 'CRITICAL' : 'WARNING',
                confidence: majorChanged ? 'HIGH' : 'MEDIUM',
                category: 'Runtime',
                title: `Node ${prev.nodeVersion} -> ${curr.nodeVersion}`,
                message: majorChanged
                    ? 'The Node major version changed since the baseline. Native modules, language features and default behaviours differ between majors.'
                    : 'The Node version changed since the baseline.',
                remedy: `Switch back with nvm use ${prev.nodeVersion} (or add a .nvmrc so the team shares one version).`
            });
        }

        if (prev.npmVersion && curr.npmVersion && prev.npmVersion !== curr.npmVersion) {
            const a = parseVersion(prev.npmVersion);
            const b = parseVersion(curr.npmVersion);
            if (!a || !b || a.major !== b.major) {
                results.push({
                    type: 'WARNING',
                    confidence: 'MEDIUM',
                    category: 'Runtime',
                    title: `npm ${prev.npmVersion} -> ${curr.npmVersion}`,
                    message: 'The npm major version changed. Majors differ in peer-dependency handling and lockfile format.',
                    remedy: `Install the previous major with npm install -g npm@${a ? a.major : prev.npmVersion}, or run npm install --legacy-peer-deps.`
                });
            }
        }

        if (prev.platform !== curr.platform || prev.arch !== curr.arch) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Runtime',
                title: `${prev.platform}-${prev.arch} -> ${curr.platform}-${curr.arch}`,
                message: 'The OS or CPU architecture differs from the baseline. Native binaries in node_modules were built for the other platform.',
                remedy: 'Delete node_modules and reinstall so native modules are rebuilt for this platform.'
            });
        }

        return results;
    }
}
