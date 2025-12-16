import { execSync } from 'child_process';
import { ChangeType } from '@causal/types';

export class GitDiffer {
    private cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    diff(refA: string, refB: string = 'HEAD'): string[] {
        try {
            const output = execSync(`git diff --name-only ${refA} ${refB}`, { cwd: this.cwd, encoding: 'utf-8' });
            return output.split('\n').filter(Boolean).map(s => s.trim());
        } catch (e) {
            return [];
        }
    }
}
