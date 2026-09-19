import { Chess } from "chess.js";
import type { AnnotatedMove, BoardContext, GamePhase, MaterialBalance } from "./types.js";
export declare class ChessEngine {
    chess: Chess;
    constructor(fen?: string);
    reset(): void;
    load(fen: string): boolean;
    fen(): string;
    turn(): "white" | "black";
    isCheck(): boolean;
    isGameOver(): boolean;
    history(): string[];
    /**
     * Generates all legal moves in the current position, richly annotated with semantic facts.
     * This is 100% deterministic code.
     */
    getAnnotatedMoves(): AnnotatedMove[];
    /**
     * Calculates material balance between white and black.
     */
    getMaterialBalance(): MaterialBalance;
    /**
     * Deterministically infers game phase based on remaining major/minor pieces and move number.
     */
    getGamePhase(): GamePhase;
    /**
     * Creates the complete structured context representing the board.
     * This matches TypeSafe's principle: provide clear, structured JSON state.
     */
    getBoardContext(): BoardContext;
    /**
     * Deterministically applies a move in SAN (Standard Algebraic Notation).
     */
    makeMove(sanOrUci: string): AnnotatedMove | null;
}
//# sourceMappingURL=chessEngine.d.ts.map