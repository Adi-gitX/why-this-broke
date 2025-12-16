export interface SystemSnapshot {
    id: string;
    timestamp: string;
    git: {
        hash: string;
        branch: string;
        dirty: boolean;
    };
    env: {
        keysHash: string;
    };
    node: {
        version: string;
        platform: string;
        arch: string;
    };
    dependencies: {
        lockfileHash: string;
    };
}
export type ChangeType = 'dependency_update' | 'file_modified' | 'env_changed' | 'node_version_changed' | 'unknown';
export interface CausalNode {
    id: string;
    description: string;
    type: ChangeType;
    confidence: number;
    source?: string;
    parents: string[];
}
export interface Diagnosis {
    summary: string;
    causes: CausalNode[];
    graph: CausalNode[];
}
