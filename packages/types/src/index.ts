
export interface SystemSnapshot {
    id: string;
    timestamp: string;
    git: {
        hash: string;
        branch: string;
        dirty: boolean;
    };
    env: {
        keysHash: string; // Hash of all keys+values to detect any change
        // We could store keys for debug: keys: string[]
    };
    node: {
        version: string;
        platform: string;
        arch: string;
    };
    dependencies: {
        lockfileHash: string; // Hash of package-lock.json
        // Map of key deps?
    };
}

export type ChangeType =
    | 'dependency_update'
    | 'file_modified'
    | 'env_changed'
    | 'node_version_changed'
    | 'unknown';

export interface CausalNode {
    id: string;
    description: string;
    type: ChangeType;
    confidence: number; // 0-1
    source?: string; // e.g., "package.json", "src/api.ts"
    parents: string[]; // IDs of causing nodes
}

export interface Diagnosis {
    summary: string;
    causes: CausalNode[]; // The root causes
    graph: CausalNode[]; // The full graph
}
