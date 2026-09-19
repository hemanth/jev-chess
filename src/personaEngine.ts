import type { ChessEngine } from "./chessEngine.js";
import { getTypeSafeClient, noul, score } from "./typeSafeClient.js";
import type {
  AnnotatedMove,
  DimensionScores,
  PersonaDecision,
  PersonaId,
  PersonaProfile,
  PersonaScoredMove,
} from "./types.js";

export const CHESS_PERSONAS: Record<PersonaId, PersonaProfile> = {
  tal: {
    id: "tal",
    name: "Mikhail Tal",
    title: "The Magician from Riga",
    quote:
      "You must take your opponent into a deep dark forest where 2+2=5, and the path leading out is only wide enough for one.",
    weights: {
      aggression: 0.45,
      prophylaxis: -0.15,
      complexity: 0.5,
      materialGreed: -0.2,
    },
  },
  petrosian: {
    id: "petrosian",
    name: "Tigran Petrosian",
    title: "Iron Tigran",
    quote: "Nothing can be done against me; my position is so solid.",
    weights: {
      aggression: 0.05,
      prophylaxis: 0.65,
      complexity: -0.3,
      materialGreed: 0.2,
    },
  },
  capablanca: {
    id: "capablanca",
    name: "José Raúl Capablanca",
    title: "The Chess Machine",
    quote:
      "A master plays simple chess, puts pieces where they belong, and simplifies into a clean endgame.",
    weights: {
      aggression: 0.2,
      prophylaxis: 0.35,
      complexity: -0.4,
      materialGreed: 0.45,
    },
  },
  coffeehouse: {
    id: "coffeehouse",
    name: "Coffeehouse Gambiteer",
    title: "Romantic Hustler",
    quote: "Checks are free, pawn storms are mandatory, and danger lurks on every rank.",
    weights: {
      aggression: 0.55,
      prophylaxis: -0.35,
      complexity: 0.4,
      materialGreed: -0.1,
    },
  },
};

const AGGRESSION_RUBRIC = [
  "Passive retreat, backward consolidation, or defensive block",
  "Neutral developing maneuver or quiet regrouping",
  "Forward thrust, central pressure, or active threat creation",
  "Direct sacrifice, attack on the king, or fierce tactical challenge",
] as const;

const PROPHYLAXIS_RUBRIC = [
  "Completely ignores king safety and opponent counterplay",
  "Standard move with ordinary tactical exposure",
  "Solid, patient reinforcement of weaknesses or squares",
  "Deep prophylactic suppression of opponent counter-ideas",
] as const;

const COMPLEXITY_RUBRIC = [
  "Clarifies position, forces trades, or liquidates tension",
  "Steady, orderly position with clear structural goals",
  "Introduces sharp asymmetry, unbalances, and multiple branches",
  "Maximum chaos: highly volatile tactical minefield",
] as const;

/**
 * AI Opponent decision engine powered by TypeSafe Composite Scoring.
 * Pattern: Atomic Multi-Dimensional Scoring + Client-Side Persona Weights.
 */
export class PersonaEngine {
  private get client() {
    return getTypeSafeClient();
  }

  /**
   * Scores candidate moves and selects the top move according to the persona's style.
   */
  public async selectMove(
    engine: ChessEngine,
    personaId: PersonaId,
    candidateLimit = 5
  ): Promise<PersonaDecision> {
    const persona = CHESS_PERSONAS[personaId];
    const allMoves = engine.getAnnotatedMoves();

    if (allMoves.length === 0) {
      throw new Error("No legal moves available in current position.");
    }

    // Candidate selection: curate a diverse pool representing varied styles
    // (tactical strikes, prophylactic castle/pawn moves, central development)
    const tacticalMoves = allMoves.filter((m) => m.isCheck || m.isCapture);
    const quietMoves = allMoves.filter((m) => !m.isCheck && !m.isCapture);

    const pool: AnnotatedMove[] = [];
    if (tacticalMoves.length > 0) pool.push(...tacticalMoves.slice(0, 2));
    if (quietMoves.length > 0) pool.push(...quietMoves.slice(0, Math.max(2, candidateLimit - pool.length)));

    const candidates = pool.slice(0, candidateLimit);
    const scoredCandidates: PersonaScoredMove[] = [];

    // Evaluate each candidate move across atomic dimensions
    for (const move of candidates) {
      const state = {
        candidate_move: {
          san: move.san,
          description: move.description,
          is_capture: move.isCapture,
          is_check: move.isCheck,
        },
        board: {
          turn: engine.turn(),
          fen: engine.fen(),
          material: engine.getMaterialBalance().description,
        },
      };

      const response = await this.client.systemOne({
        state,
        questions: {
          aggression: score(
            "How aggressive and attacking is `candidate_move.san`?",
            AGGRESSION_RUBRIC
          ),
          prophylaxis: score(
            "How well does `candidate_move.san` ensure safety and stifle opponent counterplay?",
            PROPHYLAXIS_RUBRIC
          ),
          complexity: score(
            "How much tactical tension and complexity does `candidate_move.san` inject into the board?",
            COMPLEXITY_RUBRIC
          ),
          material_greed: noul(
            "Is the move `candidate_move.san` primarily motivated by winning or defending material?"
          ),
        },
      });

      const dimScores: DimensionScores = {
        aggression: response.answers.aggression.score,
        prophylaxis: response.answers.prophylaxis.score,
        complexity: response.answers.complexity.score,
        materialGreed: response.answers.material_greed.noul,
      };

      // Composite scoring formula in code
      const compositeScore =
        persona.weights.aggression * dimScores.aggression +
        persona.weights.prophylaxis * dimScores.prophylaxis +
        persona.weights.complexity * dimScores.complexity +
        persona.weights.materialGreed * dimScores.materialGreed;

      scoredCandidates.push({
        move,
        compositeScore: Math.round(compositeScore * 1000) / 1000,
        dimensionScores: dimScores,
      });
    }

    // Sort by composite score descending
    scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    const best = scoredCandidates[0]!;
    const rationale = `${persona.name} (${persona.title}) selected ${best.move.san} with composite score ${best.compositeScore} (Aggression: ${best.dimensionScores.aggression.toFixed(1)}, Prophylaxis: ${best.dimensionScores.prophylaxis.toFixed(1)}, Complexity: ${best.dimensionScores.complexity.toFixed(1)}, Greed: ${best.dimensionScores.materialGreed.toFixed(2)}).`;

    return {
      persona,
      selectedMove: best.move,
      rankedCandidates: scoredCandidates,
      rationale,
    };
  }
}
