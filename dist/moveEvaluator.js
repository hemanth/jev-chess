import { choice, getTypeSafeClient, noul, score } from "./typeSafeClient.js";
const SHARPNESS_RUBRIC = [
    "Quiet, solid, or prophylactic maneuver with minimal immediate confrontation",
    "Normal central development or positional consolidation",
    "Sharp or provocative move with direct tactical tension",
    "High-risk sacrifice or explosive tactical clash",
];
const STRATEGIC_THEMES = {
    pawn_break: "Advances a pawn to challenge or dissolve opponent pawn structure",
    piece_activation: "Develops or repositions a piece to an active central or attacking square",
    prophylaxis: "Prevents opponent's plan, stabilizes position, or secures king safety",
    tactical_strike: "Direct capture, check, fork, pin, or tactic to win material or mate",
    king_hunt: "Advances pieces or pawns directly against the enemy king",
    simplification: "Trades pieces to consolidate advantage or clarify position",
};
/**
 * Multi-dimensional qualitative evaluator for chess moves using TypeSafe AI.
 * Pattern: Parallel Atomic Judgments + Code-Controlled Badge Synthesis.
 */
export class MoveEvaluator {
    client = getTypeSafeClient();
    async evaluateMove(engine, move) {
        const boardContext = engine.getBoardContext();
        const state = {
            evaluated_move: {
                san: move.san,
                description: move.description,
                is_capture: move.isCapture,
                is_check: move.isCheck,
                piece: move.piece,
            },
            board_context: {
                fen: boardContext.fen,
                turn: boardContext.turn,
                game_phase: boardContext.gamePhase,
                material: boardContext.materialBalance.description,
                recent_history: boardContext.recentHistory,
            },
        };
        // Parallel atomic evaluation in a single round-trip
        const response = await this.client.systemOne({
            state,
            questions: {
                tactical_sharpness: score("How sharp, tactical, or double-edged is the move `evaluated_move.san` in this position?", SHARPNESS_RUBRIC),
                strategic_theme: choice("Which primary strategic or tactical theme best characterizes `evaluated_move.san`?", STRATEGIC_THEMES),
                king_attack: noul("Does `evaluated_move.san` initiate or advance a direct attack against the enemy king?"),
                psychological_pressure: noul("Is `evaluated_move.san` a provocative or high-pressure move that challenges the opponent mentally?"),
            },
        });
        const sharpnessAnswer = response.answers.tactical_sharpness;
        const themeAnswer = response.answers.strategic_theme;
        const kingAnswer = response.answers.king_attack;
        const pressureAnswer = response.answers.psychological_pressure;
        const sharpnessScore = sharpnessAnswer.score;
        const sharpnessLevel = SHARPNESS_RUBRIC[Math.min(SHARPNESS_RUBRIC.length - 1, Math.round(sharpnessScore))] ??
            "Standard move";
        // Determine commentary badge in deterministic code
        let commentaryBadge = "Standard Move";
        if (sharpnessScore >= 2.2) {
            commentaryBadge = "🔥 Sharp Tactical Clash";
        }
        else if (kingAnswer.noul >= 0.7) {
            commentaryBadge = "👑 King Assault Initiated";
        }
        else if (themeAnswer.choice === "prophylaxis") {
            commentaryBadge = "🛡️ Prophylactic Squeeze";
        }
        else if (themeAnswer.choice === "pawn_break") {
            commentaryBadge = "⚡ Central Pawn Break";
        }
        else if (themeAnswer.choice === "simplification") {
            commentaryBadge = "⚖️ Positional Simplification";
        }
        else if (sharpnessScore <= 0.6) {
            commentaryBadge = "🧘 Calm Positional Maneuver";
        }
        else {
            commentaryBadge = "♟️ Piece Activation";
        }
        return {
            san: move.san,
            tacticalSharpness: {
                score: sharpnessScore,
                level: sharpnessLevel,
                confidence: sharpnessAnswer.confidence,
            },
            strategicTheme: {
                theme: themeAnswer.choice,
                confidence: themeAnswer.confidence,
            },
            kingAttackRisk: {
                probability: kingAnswer.noul,
            },
            psychologicalPressure: {
                probability: pressureAnswer.noul,
            },
            commentaryBadge,
        };
    }
}
//# sourceMappingURL=moveEvaluator.js.map