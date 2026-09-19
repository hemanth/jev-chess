/**
 * Domain types for TypeSafe-powered Chess Moves and Games.
 */
export type GamePhase = "opening" | "middlegame" | "endgame";
export interface AnnotatedMove {
    san: string;
    from: string;
    to: string;
    piece: string;
    color: "white" | "black";
    isCapture: boolean;
    capturedPiece?: string;
    isCheck: boolean;
    isCastling: boolean;
    description: string;
}
export interface MaterialBalance {
    whiteScore: number;
    blackScore: number;
    diff: number;
    description: string;
}
export interface BoardContext {
    fen: string;
    turn: "white" | "black";
    moveNumber: number;
    inCheck: boolean;
    materialBalance: MaterialBalance;
    gamePhase: GamePhase;
    recentHistory: string[];
    candidateMoves: AnnotatedMove[];
}
export interface MoveIntentResult {
    query: string;
    matchedMove: AnnotatedMove | null;
    san: string;
    confidence: number;
    probabilities: Record<string, number>;
    clarificationNeeded: boolean;
    alternativeCandidates: string[];
}
export interface MoveEvaluation {
    san: string;
    tacticalSharpness: {
        score: number;
        level: string;
        confidence: number;
    };
    strategicTheme: {
        theme: string;
        confidence: number;
    };
    kingAttackRisk: {
        probability: number;
    };
    psychologicalPressure: {
        probability: number;
    };
    commentaryBadge: string;
}
export type PersonaId = "tal" | "petrosian" | "capablanca" | "coffeehouse";
export interface PersonaProfile {
    id: PersonaId;
    name: string;
    title: string;
    quote: string;
    weights: {
        aggression: number;
        prophylaxis: number;
        complexity: number;
        materialGreed: number;
    };
}
export interface DimensionScores {
    aggression: number;
    prophylaxis: number;
    complexity: number;
    materialGreed: number;
}
export interface PersonaScoredMove {
    move: AnnotatedMove;
    compositeScore: number;
    dimensionScores: DimensionScores;
}
export interface PersonaDecision {
    persona: PersonaProfile;
    selectedMove: AnnotatedMove;
    rankedCandidates: PersonaScoredMove[];
    rationale: string;
}
export type MistakeArchetype = "tactical_blindness" | "poisoned_pawn_greed" | "over_extension" | "passive_concession" | "king_safety_negligence" | "sound_move";
export interface BlunderDiagnosis {
    moveNumber: number;
    playedMove: string;
    mistakeArchetype: MistakeArchetype;
    defensiveDifficulty: number;
    tacticalTension: number;
    coachAdvice: string;
}
//# sourceMappingURL=types.d.ts.map