
import { SemanticDependencyDetector } from '../src/engine/detectors/SemanticDependencyDetector';
import { SystemState, ChangeType } from '../src/internal/types';
import { explainIssues } from '../src/reporter/explain';

const mockState = (deps: any): SystemState => ({
    timestamp: Date.now(),
    runtime: { nodeVersion: '14.0.0', arch: 'x64', platform: 'darwin' },
    package: {
        dependencies: {},
        devDependencies: {},
        resolved: deps,
        scripts: {}
    },
    lockfile: { hash: 'abc', type: 'npm' },
    environment: { keys: [] },
    git: { commit: 'a', branch: 'main', isDirty: false },
    configurations: {}
});

const worldA = mockState({
    'node-fetch': { version: '2.6.1', resolved: 'https://registry/node-fetch-2.6.1.tgz' }
});

const worldB = mockState({
    'node-fetch': { version: '3.0.0', resolved: 'https://registry/node-fetch-3.0.0.tgz' }
});

console.log('--- Running Semantic Detector ---');
const detector = new SemanticDependencyDetector();
const results = detector.detect(worldA, worldB);

console.log('Results found:', results.length);

if (results.length > 0) {
    console.log('\n--- Explanation Output ---');
    console.log(explainIssues(results));
} else {
    console.error('FAILED: No issues detected!');
    process.exit(1);
}
