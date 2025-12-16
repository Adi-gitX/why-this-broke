import { Detector, SystemState, DiffResult } from '../../internal/types';

export class ConfigDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];

        // Handle migration from non-config snapshots
        const oldConfigs = oldState.configurations || {};
        const newConfigs = newState.configurations || {};

        // 1. Changed Configs
        Object.keys(newConfigs).forEach(file => {
            if (oldConfigs[file] && oldConfigs[file] !== newConfigs[file]) {
                results.push({
                    type: 'CRITICAL',
                    confidence: 'HIGH',
                    category: 'Configuration Drift',
                    message: `Critical config file changed: ${file}`,
                    remedy: `Review changes in ${file}. Config changes are high-risk.`
                });
            }
        });

        // 2. Missing Configs
        Object.keys(oldConfigs).forEach(file => {
            if (!newConfigs[file]) {
                results.push({
                    type: 'CRITICAL',
                    confidence: 'HIGH',
                    category: 'Missing Configuration',
                    message: `Config file deleted: ${file}`,
                    remedy: `Restore ${file} if this was accidental.`
                });
            }
        });

        // 3. New Configs
        Object.keys(newConfigs).forEach(file => {
            if (!oldConfigs[file]) {
                results.push({
                    type: 'INFO',
                    confidence: 'MEDIUM',
                    category: 'New Configuration',
                    message: `New config file detected: ${file}`,
                    remedy: 'Ensure this configuration is correct.'
                });
            }
        });

        return results;
    }
}
