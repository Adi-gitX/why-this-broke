export interface Context {
    depChanges: any[];
    fileChanges: string[];
}
export declare class HeuristicEngine {
    apply(ctx: Context, graph: any): void;
}
