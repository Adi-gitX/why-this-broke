import { captureState, readSnapshot, DEFAULT_SNAPSHOT_PATH, CaptureOptions } from './snapshot';
import { DiffResult } from './internal/types';
import { InferenceEngine } from './engine';

/**
 * Compares the current project state against the baseline snapshot and
 * returns findings, most likely cause first. When no usable baseline exists,
 * a single INFO finding explains how to create one.
 */
export const analyzeFailure = (snapshotPath: string = DEFAULT_SNAPSHOT_PATH, options: CaptureOptions = {}): DiffResult[] => {
    const baseline = readSnapshot(snapshotPath);

    if (!baseline.ok) {
        const messages = {
            missing: 'No baseline found, so there is nothing to compare against.',
            corrupt: `${snapshotPath} could not be parsed.`,
            legacy: `${snapshotPath} was written by an older why-broke and is missing fields.`
        };
        return [{
            type: 'INFO',
            confidence: 'LOW',
            category: 'Baseline',
            title: 'No usable baseline',
            message: messages[baseline.reason],
            remedy: 'Run "why-broke record" the next time the build works.'
        }];
    }

    const current = captureState(options);
    return new InferenceEngine().run(baseline.state, current);
};
