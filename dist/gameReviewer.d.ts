import type { ChessEngine } from "./chessEngine.js";
import type { AnnotatedMove, BlunderDiagnosis } from "./types.js";
/**
 * Diagnostic Game Reviewer that classifies chess moves and blunders into actionable semantic concepts.
 * Pattern: Verification & Escalation / Structured Diagnostics.
 */
export declare class GameReviewer {
    private client;
    diagnoseMove(engine: ChessEngine, move: AnnotatedMove, moveNumber: number): Promise<BlunderDiagnosis>;
}
//# sourceMappingURL=gameReviewer.d.ts.map