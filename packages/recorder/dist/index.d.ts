import { SystemSnapshot } from '@causal/types';
export declare class SnapshotRecorder {
    private cwd;
    constructor(cwd?: string);
    capture(): SystemSnapshot;
    private captureGit;
    private captureNode;
    private captureEnv;
    private captureDeps;
}
