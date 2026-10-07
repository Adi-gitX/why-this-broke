import { Detector, SystemState, DiffResult } from '../../internal/types';

export class ConfigDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        const prev = oldState.configurations || {};
        const curr = newState.configurations || {};

        for (const file of Object.keys(curr)) {
            if (prev[file] && prev[file] !== curr[file]) {
                results.push({
                    type: 'CRITICAL',
                    confidence: 'HIGH',
                    category: 'Configuration',
                    title: `${file} changed`,
                    message: `The contents of ${file} differ from the baseline.`,
                    remedy: `See what changed: git log -1 -p -- ${file} (or git diff -- ${file} if it is uncommitted).`
                });
            }
        }

        for (const file of Object.keys(prev)) {
            if (!curr[file]) {
                results.push({
                    type: 'CRITICAL',
                    confidence: 'HIGH',
                    category: 'Configuration',
                    title: `${file} deleted`,
                    message: `${file} existed when the baseline was recorded and is gone now.`,
                    remedy: `Restore it with git checkout -- ${file} if the deletion was accidental.`
                });
            }
        }

        for (const file of Object.keys(curr)) {
            if (!prev[file]) {
                results.push({
                    type: 'INFO',
                    confidence: 'LOW',
                    category: 'Configuration',
                    title: `${file} added`,
                    message: `${file} did not exist when the baseline was recorded. Tools pick up new config files automatically.`,
                    remedy: 'Expected if it was added on purpose.'
                });
            }
        }

        return results;
    }
}
