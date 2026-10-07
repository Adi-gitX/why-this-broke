import { Detector, DiffResult, SystemState } from '../internal/types';
import { RuntimeDetector } from './detectors/RuntimeDetector';
import { EnvDetector } from './detectors/EnvDetector';
import { DependencyDetector } from './detectors/DependencyDetector';
import { SemanticDependencyDetector } from './detectors/SemanticDependencyDetector';
import { ConfigDetector } from './detectors/ConfigDetector';
import { GitDetector } from './detectors/GitDetector';

const TYPE_RANK = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
const CONFIDENCE_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

/** Orders findings so the most likely cause comes first. */
export const sortFindings = (findings: DiffResult[]): DiffResult[] =>
    [...findings].sort((a, b) =>
        TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
        CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence]
    );

/** Runs every detector against a baseline and the current state. */
export class InferenceEngine {
    private detectors: Detector[];

    constructor(detectors?: Detector[]) {
        this.detectors = detectors || [
            new RuntimeDetector(),
            new DependencyDetector(),
            new SemanticDependencyDetector(),
            new ConfigDetector(),
            new EnvDetector(),
            new GitDetector()
        ];
    }

    public run(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        for (const detector of this.detectors) {
            try {
                results.push(...detector.detect(oldState, newState));
            } catch (err) {
                const name = detector.constructor?.name || 'detector';
                results.push({
                    type: 'INFO',
                    confidence: 'LOW',
                    category: 'why-broke',
                    title: `${name} failed`,
                    message: err instanceof Error ? err.message : String(err),
                    remedy: 'Please report this at https://github.com/Adi-gitX/why-this-broke/issues.'
                });
            }
        }
        return sortFindings(results);
    }
}
