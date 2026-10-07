import { Detector, SystemState, DiffResult } from '../../internal/types';

export class EnvDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        const prevKeys = new Set(oldState.environment?.keys || []);
        const currKeys = new Set(newState.environment?.keys || []);

        const missing = [...prevKeys].filter(k => !currKeys.has(k));
        if (missing.length > 0) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Environment',
                title: `${missing.length} variable${missing.length === 1 ? '' : 's'} no longer set`,
                message: `Set when the baseline was recorded, not set now: ${missing.join(', ')}.`,
                remedy: 'Add them to .env, or export them in this shell before running the command.'
            });
        }

        // Variables that .env.example started declaring since the baseline but that are not set here.
        const declaredNow = newState.environment?.declared || [];
        const declaredBefore = new Set(oldState.environment?.declared || []);
        const newlyDeclared = declaredNow.filter(k => !declaredBefore.has(k) && !currKeys.has(k));
        if (newlyDeclared.length > 0) {
            results.push({
                type: 'CRITICAL',
                confidence: 'HIGH',
                category: 'Environment',
                title: `${newlyDeclared.length} new variable${newlyDeclared.length === 1 ? '' : 's'} in .env.example`,
                message: `Declared in .env.example since the baseline but not set here: ${newlyDeclared.join(', ')}.`,
                remedy: 'Copy the new entries from .env.example into your .env and fill in the values.'
            });
        }

        return results;
    }
}
