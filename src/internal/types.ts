export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueType = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ResolvedDependency {
    /** Version actually installed in node_modules. */
    version: string;
    /** Tarball URL or git ref, when known. */
    resolved?: string;
    /** Module system declared by the installed package ("type" in its package.json). */
    type?: 'commonjs' | 'module' | 'unknown';
}

export interface ExecutionContext {
    command: string;
    cwd: string;
    nodeEnv?: string;
    exitCode?: number;
    stderrSnippet?: string;
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
        /** Ranges from package.json. */
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
        /** Versions actually present in node_modules. */
        resolved: Record<string, ResolvedDependency>;
        scripts: Record<string, string>;
    };
    lockfile: {
        hash: string;
        type: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'none';
    };
    environment: {
        /** Variable names only. Values are never recorded. */
        keys: string[];
        /** Names declared in .env.example (or .env.sample / .env.template), if present. */
        declared?: string[];
    };
    git: {
        commit: string;
        branch: string;
        isDirty: boolean;
    };
    /** Config file name -> sha256 of its contents. */
    configurations: Record<string, string>;
    execution?: ExecutionContext;
}

// -- Causal annotations attached to dependency findings --

export enum ChangeType {
    BEHAVIORAL = 'BEHAVIORAL',
    CONTRACTUAL = 'CONTRACTUAL',
    BOUNDARY = 'BOUNDARY',
    CONTEXTUAL = 'CONTEXTUAL',
    UNKNOWN = 'UNKNOWN'
}

export interface CausalNode {
    id: string;
    description: string;
    changeType: ChangeType;
    confidence: number;
    diff?: {
        prev: string;
        curr: string;
    };
}

export interface CausalEdge {
    from: string;
    to: string;
    reason: string;
    weight: number;
}

export interface CausalGraph {
    nodes: CausalNode[];
    edges: CausalEdge[];
    rootCauseIds: string[];
    failureNodeId: string;
}

export interface DiffResult {
    type: IssueType;
    confidence: ConfidenceLevel;
    category: string;
    /** Short one-line headline, e.g. "node-fetch 2.6.12 -> 3.0.0". Optional. */
    title?: string;
    /** What changed and why it matters. */
    message: string;
    /** What to do about it. */
    remedy: string;
    causalGraph?: CausalGraph;
}

export interface Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[];
}
