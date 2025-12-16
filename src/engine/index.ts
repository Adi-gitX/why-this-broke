import { Detector, DiffResult, SystemState } from '../internal/types';
import { RuntimeDetector } from './detectors/RuntimeDetector';
import { EnvDetector } from './detectors/EnvDetector';
import { DependencyDetector } from './detectors/DependencyDetector';
import { GitDetector } from './detectors/GitDetector';
import { ConfigDetector } from './detectors/ConfigDetector';

export class InferenceEngine {
    private detectors: Detector[];

    constructor() {
        // Register all detectors
        this.detectors = [
            new RuntimeDetector(),
            new EnvDetector(),
            new DependencyDetector(),
            new GitDetector(),
            new ConfigDetector()
        ];
    }

    public run(oldState: SystemState, newState: SystemState): DiffResult[] {
        let results: DiffResult[] = [];

        for (const detector of this.detectors) {
            try {
                const detectorResults = detector.detect(oldState, newState);
                results = results.concat(detectorResults);
            } catch (e) {
                console.error('Detector failed:', e);
            }
        }

        // Sort by confidence
        return results.sort((a, b) => {
            const score = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return score[b.confidence] - score[a.confidence];
        });
    }
}
