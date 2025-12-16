export interface DepChange {
    name: string;
    from: string | null;
    to: string | null;
}
export declare class DependencyDiffer {
    compare(lockA: any, lockB: any): DepChange[];
    private flatten;
}
