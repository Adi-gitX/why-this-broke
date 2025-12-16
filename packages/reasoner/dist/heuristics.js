"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicEngine = void 0;
class HeuristicEngine {
    apply(ctx, graph) {
        // Rule 1: Dependency Major Update
        ctx.depChanges.forEach(d => {
            const prevMajor = d.from ? d.from.split('.')[0] : null;
            const currMajor = d.to ? d.to.split('.')[0] : null;
            if (prevMajor && currMajor && prevMajor !== currMajor) {
                const node = graph.addNode(`Major dependency upgrade: ${d.name} (${d.from} -> ${d.to})`, 'dependency_update', 0.9);
                // Heuristic: If files changed include usage of this dep? (Advanced)
                // For now, simple correlation.
            }
        });
        // Rule 2: TS/JS File changes
        if (ctx.fileChanges.length > 0) {
            graph.addNode(`Source code modified in ${ctx.fileChanges.length} files`, 'file_modified', 0.5 // Lower confidence if we don't know WHY
            );
        }
    }
}
exports.HeuristicEngine = HeuristicEngine;
