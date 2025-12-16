"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalGraph = void 0;
const crypto_1 = __importDefault(require("crypto"));
const heuristics_1 = require("./heuristics");
class CausalGraph {
    nodes = new Map();
    heuristics = new heuristics_1.HeuristicEngine();
    addNode(description, type, confidence = 0.5) {
        const id = crypto_1.default.randomUUID();
        const node = { id, description, type, confidence, parents: [] };
        this.nodes.set(id, node);
        return node;
    }
    // Analyze diffs and build graph
    ingest(context) {
        this.heuristics.apply(context, this);
    }
    diagnose() {
        const all = Array.from(this.nodes.values());
        const causes = all.filter(n => n.confidence > 0.7).sort((a, b) => b.confidence - a.confidence);
        return {
            summary: causes.length ? 'Found potential causes based on heuristics.' : 'Analysis inconclusive.',
            causes,
            graph: all
        };
    }
}
exports.CausalGraph = CausalGraph;
