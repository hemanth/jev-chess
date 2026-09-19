import type { ChessEngine } from "./chessEngine.js";
import type { MoveIntentResult } from "./types.js";
/**
 * Resolves natural language user commands into exact legal chess moves using TypeSafe Choice.
 * Pattern: Select Instead of Generate + Confidence-Gated Ambiguity Resolution.
 */
export declare class MoveResolver {
    private client;
    /**
     * Resolves natural language intent (e.g. "push my e-pawn two squares", "castle kingside")
     * into a verified legal move.
     */
    resolveIntent(engine: ChessEngine, userQuery: string, confidenceThreshold?: number): Promise<MoveIntentResult>;
}
//# sourceMappingURL=moveResolver.d.ts.map