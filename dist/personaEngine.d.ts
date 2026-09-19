import type { ChessEngine } from "./chessEngine.js";
import type { PersonaDecision, PersonaId, PersonaProfile } from "./types.js";
export declare const CHESS_PERSONAS: Record<PersonaId, PersonaProfile>;
/**
 * AI Opponent decision engine powered by TypeSafe Composite Scoring.
 * Pattern: Atomic Multi-Dimensional Scoring + Client-Side Persona Weights.
 */
export declare class PersonaEngine {
    private client;
    /**
     * Scores candidate moves and selects the top move according to the persona's style.
     */
    selectMove(engine: ChessEngine, personaId: PersonaId, candidateLimit?: number): Promise<PersonaDecision>;
}
//# sourceMappingURL=personaEngine.d.ts.map