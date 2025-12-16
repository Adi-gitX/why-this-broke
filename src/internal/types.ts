export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueType = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SystemState {
    timestamp: number;
    runtime: {
        nodeVersion: string;
        npmVersion?: string;
        arch: string;
        platform: string;
    };
    package: {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
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
        isDirty: boolean; // Simple check if tree has modifications
    };
}

export interface DiffResult {
    type: IssueType;
    confidence: ConfidenceLevel;
    category: string;
    message: string;
    remedy: string;
}

export interface Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[];
}
