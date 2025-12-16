import fs from 'fs';
import { captureState } from './snapshot';
import { DiffResult, SystemState } from './internal/types';
import { InferenceEngine } from './engine';

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

    try {
        const rawState = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

        // simple schema check
        if (!rawState.runtime || !rawState.runtime.nodeVersion) {
            return [{
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Breaking Change',
                message: 'Your system snapshot is from an older version of why-broke.',
                remedy: 'Run "why-broke record" to update your baseline to v1.2.'
            }];
        }

        const oldState: SystemState = rawState;
        const newState = captureState();

        const engine = new InferenceEngine();
        return engine.run(oldState, newState);

    } catch (e) {
        return [{
            type: 'CRITICAL',
            confidence: 'LOW',
            category: 'Corrupt Snapshot',
            message: 'Could not read the previous state file.',
            remedy: 'Run "why-broke record" to create a fresh baseline.'
        }];
    }
};
