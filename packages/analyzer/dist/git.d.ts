export declare class GitDiffer {
    private cwd;
    constructor(cwd?: string);
    diff(refA: string, refB?: string): string[];
}
