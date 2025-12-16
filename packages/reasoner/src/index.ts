import { CausalNode, Diagnosis, ChangeType } from '@causal/types';
import crypto from 'crypto';
import { HeuristicEngine, Context } from './heuristics';

export class CausalGraph {
    private nodes: Map<string, CausalNode> = new Map();
    private heuristics = new HeuristicEngine();

    addNode(description: string, type: ChangeType, confidence: number = 0.5): CausalNode {
        const id = crypto.randomUUID();
        const node: CausalNode = { id, description, type, confidence, parents: [] };
        this.nodes.set(id, node);
        return node;
    }

    // Analyze diffs and build graph
    ingest(context: Context) {
        this.heuristics.apply(context, this);
    }

    diagnose(): Diagnosis {
        const all = Array.from(this.nodes.values());
        const causes = all.filter(n => n.confidence > 0.7).sort((a, b) => b.confidence - a.confidence);
        return {
            summary: causes.length ? 'Found potential causes based on heuristics.' : 'Analysis inconclusive.',
            causes,
            graph: all
        };
    }
}
