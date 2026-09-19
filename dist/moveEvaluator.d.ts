import type { ChessEngine } from "./chessEngine.js";
import type { AnnotatedMove, MoveEvaluation } from "./types.js";
/**
 * Multi-dimensional qualitative evaluator for chess moves using TypeSafe AI.
 * Pattern: Parallel Atomic Judgments + Code-Controlled Badge Synthesis.
 */
export declare class MoveEvaluator {
    private client;
    evaluateMove(engine: ChessEngine, move: AnnotatedMove): Promise<MoveEvaluation>;
}
//# sourceMappingURL=moveEvaluator.d.ts.map