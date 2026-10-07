import { Detector, DiffResult, SystemState, ChangeType, CausalNode, ConfidenceLevel, IssueType } from '../../internal/types';
import { KNOWN_BREAKING_CHANGES } from '../knownBreakingChanges';
import { classifyBump, parseVersion } from '../semver';

/** Compares the versions actually installed in node_modules. */
export class SemanticDependencyDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        const oldResolved = oldState.package.resolved || {};
        const newResolved = newState.package.resolved || {};

        for (const [name, curr] of Object.entries(newResolved)) {
            const prev = oldResolved[name];
            if (!prev || prev.version === curr.version) continue;

            const bump = classifyBump(prev.version, curr.version);
            const title = `${name} ${prev.version} -> ${curr.version}`;

            let type: IssueType;
            let confidence: ConfidenceLevel;
            let changeType: ChangeType;
            let message: string;
            let remedy: string;

            const fromMajor = parseVersion(prev.version)?.major;
            const toMajor = parseVersion(curr.version)?.major;
            const rule = fromMajor !== undefined && toMajor !== undefined
                ? (KNOWN_BREAKING_CHANGES[name] || []).find(r => r.applies(fromMajor, toMajor))
                : undefined;

            const becameEsm = prev.type && prev.type !== 'module' && curr.type === 'module';

            if (rule) {
                type = 'CRITICAL';
                confidence = 'HIGH';
                changeType = ChangeType.BOUNDARY;
                message = rule.reason;
                remedy = rule.fix;
            } else if (becameEsm) {
                type = 'CRITICAL';
                confidence = 'HIGH';
                changeType = ChangeType.BOUNDARY;
                message = `${name} now declares "type": "module". If your code loads it with require(), that now throws ERR_REQUIRE_ESM.`;
                remedy = `Load it with await import("${name}"), or pin ${name}@${prev.version}.`;
            } else if (bump === 'major') {
                type = 'CRITICAL';
                confidence = 'HIGH';
                changeType = ChangeType.BOUNDARY;
                message = `Major version change. Breaking changes are expected between majors.`;
                remedy = `Pin the previous version (npm install ${name}@${prev.version}) to confirm, then follow the ${name} migration notes.`;
            } else if (bump === 'minor') {
                type = 'WARNING';
                confidence = 'MEDIUM';
                changeType = ChangeType.BEHAVIORAL;
                message = 'Minor version change. Behaviour can differ even when the public API is compatible.';
                remedy = `Pin ${name}@${prev.version} to rule it out.`;
            } else {
                type = 'INFO';
                confidence = 'LOW';
                changeType = ChangeType.BEHAVIORAL;
                message = bump === 'patch' ? 'Patch version change.' : 'Version changed.';
                remedy = `Unlikely to be the cause, but ${name}@${prev.version} restores the baseline.`;
            }

            const nodeId = `dep-change:${name}`;
            const node: CausalNode = {
                id: nodeId,
                description: title,
                changeType,
                confidence: confidence === 'HIGH' ? 0.9 : confidence === 'MEDIUM' ? 0.5 : 0.2,
                diff: { prev: prev.version, curr: curr.version }
            };

            results.push({
                type,
                confidence,
                category: 'Dependencies',
                title,
                message,
                remedy,
                causalGraph: { nodes: [node], edges: [], rootCauseIds: [nodeId], failureNodeId: 'failure' }
            });
        }

        return results;
    }
}
