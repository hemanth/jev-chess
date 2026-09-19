import { choice, getTypeSafeClient, score } from "./typeSafeClient.js";
const MISTAKE_ARCHETYPES = {
    sound_move: "A solid, principled move with no critical defect",
    tactical_blindness: "Overlooked an immediate tactical blow, fork, pin, skewer, or check",
    poisoned_pawn_greed: "Grabbed material at the fatal expense of development or king safety",
    over_extension: "Pushed pawns or pieces too far forward, creating irreparable structural holes",
    passive_concession: "Retreated timidly, yielding tempo and spatial dominance to the opponent",
    king_safety_negligence: "Compromised the pawn shield or exposed the monarch to a deadly storm",
};
const DEFENSIVE_DIFFICULTY_RUBRIC = [
    "Comfortable defense; natural and straightforward moves maintain balance",
    "Tense defense; requires disciplined calculation and piece coordination",
    "Precise tightrope; requires narrow, counter-intuitive only-moves to survive",
    "Hopeless or practically impossible for a human player to defend under pressure",
];
const TENSION_RUBRIC = [
    "Peaceful and quiet; strategic maneuvering behind closed lines",
    "Building central friction and contested outposts",
    "Sharp tactical skirmish; pieces in contact and multiple captures pending",
    "Decisive boiling point; mutual king attacks and explosive complications",
];
/**
 * Diagnostic Game Reviewer that classifies chess moves and blunders into actionable semantic concepts.
 * Pattern: Verification & Escalation / Structured Diagnostics.
 */
export class GameReviewer {
    client = getTypeSafeClient();
    async diagnoseMove(engine, move, moveNumber) {
        const boardContext = engine.getBoardContext();
        const state = {
            game_state: {
                fen: boardContext.fen,
                turn: boardContext.turn,
                phase: boardContext.gamePhase,
                material: boardContext.materialBalance.description,
                recent_moves: boardContext.recentHistory,
            },
            played_move: {
                san: move.san,
                description: move.description,
                is_capture: move.isCapture,
                is_check: move.isCheck,
            },
        };
        const response = await this.client.systemOne({
            state,
            questions: {
                archetype: choice("Which mistake or positional category best describes `played_move.san`?", MISTAKE_ARCHETYPES),
                defensive_difficulty: score("How difficult is it to defend or recover from this position after `played_move.san`?", DEFENSIVE_DIFFICULTY_RUBRIC),
                tension: score("What is the overall tactical and psychological tension level on the board?", TENSION_RUBRIC),
            },
        });
        const archetypeChoice = response.answers.archetype.choice;
        const diffScore = response.answers.defensive_difficulty.score;
        const tensionScore = response.answers.tension.score;
        let coachAdvice = "Keep developing actively and control the center.";
        switch (archetypeChoice) {
            case "tactical_blindness":
                coachAdvice = "Always scan for opponent checks, captures, and threats before finalizing your move.";
                break;
            case "poisoned_pawn_greed":
                coachAdvice = "Do not go pawn hunting with an uncastled king or uncoordinated pieces!";
                break;
            case "over_extension":
                coachAdvice = "Pawns cannot move backwards; every advance creates irreversible weaknesses.";
                break;
            case "passive_concession":
                coachAdvice = "When pushed, look for counter-attacking resources rather than passive retreats.";
                break;
            case "king_safety_negligence":
                coachAdvice = "Castling and securing your king should take priority over peripheral adventures.";
                break;
            case "sound_move":
                coachAdvice = "Excellent, harmonious play. Continue executing your strategic plan.";
                break;
        }
        return {
            moveNumber,
            playedMove: move.san,
            mistakeArchetype: archetypeChoice,
            defensiveDifficulty: diffScore,
            tacticalTension: tensionScore,
            coachAdvice,
        };
    }
}
//# sourceMappingURL=gameReviewer.js.map