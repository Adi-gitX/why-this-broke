export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueType = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ResolvedDependency {
    version: string;
    resolved?: string; // The tarball url or git ref
    type?: 'commonjs' | 'module' | 'unknown'; // Vital for CJS/ESM issues
}

export interface ExecutionContext {
    command: string;
    cwd: string;
    nodeEnv?: string;
    exitCode?: number;
    stderrSnippet?: string; // Capture last N lines of failure
}

export interface SystemState {
    timestamp: number;
    runtime: {
        nodeVersion: string;
        npmVersion?: string;
        arch: string;
        platform: string;
    };
    package: {
        dependencies: Record<string, string>; // From package.json
        devDependencies: Record<string, string>; // From package.json
        resolved: Record<string, ResolvedDependency>; // Actually installed versions
        scripts: Record<string, string>;
    };
    lockfile: {
        hash: string;
        type: 'npm' | 'yarn' | 'pnpm' | 'none';
    };
    environment: {
        keys: string[]; // Only keys, never values
    };
    git: {
        commit: string;
        branch: string;
        isDirty: boolean;
    };
    configurations: Record<string, string>; // filename -> hash
    execution?: ExecutionContext; // Context of the run (if available)
}

// -- Causal Reasoning Types --

export enum ChangeType {
    BEHAVIORAL = 'BEHAVIORAL', // e.g. async/sync change
    CONTRACTUAL = 'CONTRACTUAL', // e.g. signature change (hard to detect without types, but we can infer)
    BOUNDARY = 'BOUNDARY', // e.g. CJS -> ESM, version major bump
    CONTEXTUAL = 'CONTEXTUAL', // e.g. Node 14 -> 18, Dev -> Prod
    UNKNOWN = 'UNKNOWN'
}

export interface CausalNode {
    id: string;
    description: string;
    changeType: ChangeType;
    confidence: number; // 0-1
    diff?: {
        prev: string;
        curr: string;
    };
}

export interface CausalEdge {
    from: string; // Node ID
    to: string;   // Node ID
    reason: string; // "causes", "triggers", "implies"
    weight: number;
}

export interface CausalGraph {
    nodes: CausalNode[];
    edges: CausalEdge[];
    rootCauseIds: string[]; // The nodes we think started it
    failureNodeId: string;  // The failure event itself
}

export interface DiffResult {
    type: IssueType;
    confidence: ConfidenceLevel;
    category: string;
    message: string;
    remedy: string;
    causalGraph?: CausalGraph; // The proof
}

export interface Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[];
}
