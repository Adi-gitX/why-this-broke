import { Detector, SystemState, DiffResult } from '../../internal/types';

export class RuntimeDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];

        // 1. Node Version Check
        if (oldState.runtime.nodeVersion !== newState.runtime.nodeVersion) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Runtime Drift',
                message: `Node version changed from ${oldState.runtime.nodeVersion} to ${newState.runtime.nodeVersion}`,
                remedy: `Switch back to ${oldState.runtime.nodeVersion} using nvm or nodenv.`
            });
        }

        // 2. Platform/Arch Check (Rare but fatal)
        if (oldState.runtime.platform !== newState.runtime.platform || oldState.runtime.arch !== newState.runtime.arch) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'System Architecture',
                message: `Underlying OS/Arch changed: ${oldState.runtime.platform}-${oldState.runtime.arch} -> ${newState.runtime.platform}-${newState.runtime.arch}`,
                remedy: 'Re-install node_modules (npm rebuild) to fix native bindings.'
            });
        }

        return results;
    }
}
