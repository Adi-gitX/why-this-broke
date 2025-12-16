import { GitDiffer } from './git';
import { DependencyDiffer, DepChange } from './dependencies';

export class Analyzer {
    private git: GitDiffer;
    private deps: DependencyDiffer;

    constructor(cwd: string) {
        this.git = new GitDiffer(cwd);
        this.deps = new DependencyDiffer();
    }

    async analyzeFiles(refA: string, refB: string): Promise<string[]> {
        return this.git.diff(refA, refB);
    }

    async analyzeDeps(lockA: any, lockB: any): Promise<DepChange[]> {
        return this.deps.compare(lockA, lockB);
    }
}
