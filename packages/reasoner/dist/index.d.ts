import { CausalNode, Diagnosis, ChangeType } from '@causal/types';
import { Context } from './heuristics';
export declare class CausalGraph {
    private nodes;
    private heuristics;
    addNode(description: string, type: ChangeType, confidence?: number): CausalNode;
    ingest(context: Context): void;
    diagnose(): Diagnosis;
}
