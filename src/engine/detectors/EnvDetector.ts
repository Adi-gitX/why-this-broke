import { Detector, SystemState, DiffResult } from '../../internal/types';

export class EnvDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];

        // Find missing keys
        const missing = oldState.environment.keys.filter(k => !newState.environment.keys.includes(k));

        if (missing.length > 0) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Environment',
                message: `Missing variables: ${missing.join(', ')}`,
                remedy: 'Check your .env file or export these variables.'
            });
        }

        return results;
    }
}
