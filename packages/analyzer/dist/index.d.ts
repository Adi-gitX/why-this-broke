import { DepChange } from './dependencies';
export declare class Analyzer {
    private git;
    private deps;
    constructor(cwd: string);
    analyzeFiles(refA: string, refB: string): Promise<string[]>;
    analyzeDeps(lockA: any, lockB: any): Promise<DepChange[]>;
}
