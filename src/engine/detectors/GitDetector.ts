import { Detector, SystemState, DiffResult } from '../../internal/types';
import { execSync } from 'child_process';

const short = (commit: string) => commit.slice(0, 7);

export class GitDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];
        const prev = oldState.git;
        const curr = newState.git;

        if (prev.commit !== 'unknown' && curr.commit !== 'unknown' && prev.commit !== curr.commit) {
            let changedFiles: string[] | undefined;
            try {
                const cwd = newState.execution?.cwd || process.cwd();
                const output = execSync(`git diff --name-only ${prev.commit} ${curr.commit}`, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
                changedFiles = output.trim().split('\n').filter(Boolean);
            } catch {
                changedFiles = undefined;
            }

            if (changedFiles === undefined) {
                results.push({
                    type: 'INFO',
                    confidence: 'LOW',
                    category: 'Source',
                    title: `HEAD moved from ${short(prev.commit)} to ${short(curr.commit)}`,
                    message: 'The baseline commit is not in this repository (it may have been rebased away), so the file diff could not be computed.',
                    remedy: `git log --oneline -20 shows what landed recently.`
                });
            } else if (changedFiles.length > 0) {
                const preview = changedFiles.slice(0, 5).join(', ') + (changedFiles.length > 5 ? ', ...' : '');
                results.push({
                    type: 'INFO',
                    confidence: 'LOW',
                    category: 'Source',
                    title: `${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'} changed since ${short(prev.commit)}`,
                    message: preview,
                    remedy: `If nothing above explains the failure, the cause is in the code: git diff ${short(prev.commit)} ${short(curr.commit)} --stat.`
                });
            }
        }

        if (curr.isDirty) {
            results.push({
                type: 'INFO',
                confidence: 'LOW',
                category: 'Source',
                title: 'Uncommitted changes in the working tree',
                message: 'Local edits are present on top of the committed state.',
                remedy: 'git stash to test whether the committed state alone fails.'
            });
        }

        return results;
    }
}
