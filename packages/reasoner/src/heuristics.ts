import { CausalNode } from '@causal/types';
// Note: In monorepo we should import from package, but simplified for now as internal ref
// Better: Define DepChange in types? For now, we'll redefine or relax type.
// Actually, let's just make it loose for this prototype.

// Loose interface to avoid hard coupling with analyzer internals for now
interface DepChange {
    name: string;
    from: string | null;
    to: string | null;
}

export interface Context {
    depChanges: any[]; // DepChange[]
    fileChanges: string[];
    // envChanges, nodeChanges...
}

export class HeuristicEngine {

    apply(ctx: Context, graph: any): void { // Graph: CausalGraph
        // Rule 1: Dependency Major Update
        ctx.depChanges.forEach(d => {
            const prevMajor = d.from ? d.from.split('.')[0] : null;
            const currMajor = d.to ? d.to.split('.')[0] : null;

            if (prevMajor && currMajor && prevMajor !== currMajor) {
                const node = graph.addNode(
                    `Major dependency upgrade: ${d.name} (${d.from} -> ${d.to})`,
                    'dependency_update',
                    0.9
                );
                // Heuristic: If files changed include usage of this dep? (Advanced)
                // For now, simple correlation.
            }
        });

        // Rule 2: TS/JS File changes
        if (ctx.fileChanges.length > 0) {
            graph.addNode(
                `Source code modified in ${ctx.fileChanges.length} files`,
                'file_modified',
                0.5 // Lower confidence if we don't know WHY
            );
        }
    }
}
