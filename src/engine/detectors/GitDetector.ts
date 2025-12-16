import { Detector, SystemState, DiffResult } from '../../internal/types';
import { execSync } from 'child_process';

export class GitDetector implements Detector {
    detect(oldState: SystemState, newState: SystemState): DiffResult[] {
        const results: DiffResult[] = [];

        if (oldState.git.commit !== newState.git.commit) {
            try {
                // Try to get a file count diff
                const diffCmd = `git diff --name-only ${oldState.git.commit} HEAD`;
                const output = execSync(diffCmd, { stdio: 'pipe' }).toString();
                const files = output.trim().split('\n').filter(Boolean);

                if (files.length > 0) {
                    results.push({
                        type: 'INFO',
                        confidence: 'LOW',
                        category: 'Source Code',
                        message: `${files.length} files modified between ${oldState.git.commit.substring(0, 6)} and HEAD.`,
                        remedy: 'Review local changes or run "why-broke record" if code is robust.'
                    });
                }
            } catch (e) {
                results.push({
                    type: 'INFO',
                    confidence: 'LOW',
                    category: 'Git History',
                    message: `Commit changed from ${oldState.git.commit.substring(0, 6)} to ${newState.git.commit.substring(0, 6)}`,
                    remedy: 'Review git log.'
                });
            }
        }

        if (newState.git.isDirty) {
            results.push({
                type: 'WARNING',
                confidence: 'LOW',
                category: 'Uncommitted Changes',
                message: 'You have uncommitted changes in your working tree.',
                remedy: 'Stash or commit changes to isolate the issue.'
            });
        }

        return results;
    }
}
