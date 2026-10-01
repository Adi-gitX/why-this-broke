import { Detector, DiffResult, SystemState, ChangeType, CausalGraph, CausalNode, CausalEdge } from '../../internal/types';

const KNOWN_BREAKING_CHANGES: Record<string, { from: string, to: string, reason: string, fix: string }[]> = {
    'node-fetch': [
        { from: '2.', to: '3.', reason: 'Switched from CommonJS to ESM-only. require() no longer works.', fix: 'Use dynamic import() or downgrade to v2.' }
    ],
    'uuid': [
        { from: '3.', to: '7.', reason: 'API cleanup, default export removed.', fix: 'Use named imports { v4 as uuidv4 }.' },
        { from: '7.', to: '8.', reason: 'ESM transition.', fix: 'Check import syntax.' }
    ],
    'axios': [
        { from: '0.', to: '1.', reason: 'Major release, breaking changes in API.', fix: 'Review migration guide.' }
    ]
};

type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export class SemanticDependencyDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        const oldResolved = oldState.package.resolved || {};
        const newResolved = newState.package.resolved || {};

        // 1. Detect Version Drifts & Boundary Crossings
        for (const [pkgName, newInfo] of Object.entries(newResolved)) {
            const oldInfo = oldResolved[pkgName];

            if (!oldInfo) {
                // New dependency
                continue;
            }

            if (oldInfo.version !== newInfo.version) {
                let changeType = this.classifyChange(oldInfo.version, newInfo.version);
                let message = `Dependency '${pkgName}' upgraded (${oldInfo.version} -> ${newInfo.version}).`;
                let remedy = `Revert '${pkgName}' to ${oldInfo.version} or check changelog.`;
                let confidence: ConfidenceLevel = changeType === ChangeType.BOUNDARY ? 'HIGH' : 'MEDIUM';

                // Check known registry
                const known = KNOWN_BREAKING_CHANGES[pkgName];
                if (known) {
                    for (const rule of known) {
                        if (checkMatch(oldInfo.version, rule.from) && checkMatch(newInfo.version, rule.to)) {
                            message = `${pkgName}: ${rule.reason}`;
                            remedy = rule.fix;
                            confidence = 'HIGH';
                            changeType = ChangeType.BOUNDARY;
                            break;
                        }
                    }
                }

                const nodeId = `dep-change:${pkgName}`;
                const node: CausalNode = {
                    id: nodeId,
                    description: `Dependency '${pkgName}' changed from ${oldInfo.version} to ${newInfo.version}`,
                    changeType: changeType,
                    confidence: confidence === 'HIGH' ? 0.9 : 0.5,
                    diff: { prev: oldInfo.version, curr: newInfo.version }
                };

                if (changeType === ChangeType.BOUNDARY || changeType === ChangeType.BEHAVIORAL || confidence === 'HIGH') {
                    results.push({
                        type: confidence === 'HIGH' ? 'CRITICAL' : 'WARNING',
                        confidence: confidence,
                        category: 'Dependency Drift',
                        message: message,
                        remedy: remedy,
                        causalGraph: {
                            nodes: [node],
                            edges: [],
                            rootCauseIds: [nodeId],
                            failureNodeId: 'failure'
                        }
                    });
                }
            }
        }

        return results;
    }

    private classifyChange(oldVer: string, newVer: string): ChangeType {
        const oldMajor = semverMajor(oldVer);
        const newMajor = semverMajor(newVer);

        if (oldMajor !== newMajor) {
            return ChangeType.BOUNDARY;
        }

        if (oldMajor === 0 && oldVer !== newVer) {
            return ChangeType.BOUNDARY;
        }

        return ChangeType.BEHAVIORAL;
    }
}

function semverMajor(version: string): number {
    const match = version.match(/^(\d+)\./);
    return match ? parseInt(match[1], 10) : 0;
}

function checkMatch(realVersion: string, rulePattern: string): boolean {
    if (rulePattern.endsWith('.')) {
        return realVersion.startsWith(rulePattern);
    }
    return realVersion === rulePattern;
}
