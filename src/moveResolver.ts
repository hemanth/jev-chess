import type { ChessEngine } from "./chessEngine.js";
import { choice, getTypeSafeClient } from "./typeSafeClient.js";
import type { AnnotatedMove, MoveIntentResult } from "./types.js";

/**
 * Resolves natural language user commands into exact legal chess moves using TypeSafe Choice.
 * Pattern: Select Instead of Generate + Confidence-Gated Ambiguity Resolution.
 */
export class MoveResolver {
  private client = getTypeSafeClient();

  /**
   * Resolves natural language intent (e.g. "push my e-pawn two squares", "castle kingside")
   * into a verified legal move.
   */
  public async resolveIntent(
    engine: ChessEngine,
    userQuery: string,
    confidenceThreshold = 0.55
  ): Promise<MoveIntentResult> {
    const candidates = engine.getAnnotatedMoves();

    if (candidates.length === 0) {
      return {
        query: userQuery,
        matchedMove: null,
        san: "none",
        confidence: 1.0,
        probabilities: {},
        clarificationNeeded: false,
        alternativeCandidates: [],
      };
    }

    // Direct exact match fast-path (e.g. user literally typed "e4" or "Nf3")
    const exactMatch = candidates.find(
      (m) =>
        m.san.toLowerCase() === userQuery.trim().toLowerCase() ||
        `${m.from}${m.to}`.toLowerCase() === userQuery.trim().toLowerCase()
    );
    if (exactMatch) {
      return {
        query: userQuery,
        matchedMove: exactMatch,
        san: exactMatch.san,
        confidence: 1.0,
        probabilities: { [exactMatch.san]: 1.0 },
        clarificationNeeded: false,
        alternativeCandidates: [],
      };
    }

    // Build Choice criteria from legal moves
    const criteria: Record<string, string> = {};
    for (const c of candidates) {
      criteria[c.san] = c.description;
    }
    criteria["none"] = "No legal candidate move matches what the player requested";

    const state = {
      user_intent: userQuery,
      board: {
        turn: engine.turn(),
        in_check: engine.isCheck(),
        fen: engine.fen(),
      },
      legal_moves: candidates.map((c) => ({
        san: c.san,
        description: c.description,
      })),
    };

    const response = await this.client.systemOne({
      state,
      questions: {
        matched_move: choice(
          "Which legal chess move in `legal_moves` best fulfills the player's command in `user_intent`?",
          criteria
        ),
      },
    });

    const answer = response.answers.matched_move;
    const selectedSan = answer.choice;
    const confidence = answer.confidence;
    const probabilities = answer.probabilities as Record<string, number>;

    // Sort alternatives by probability
    const sortedOptions = Object.entries(probabilities)
      .filter(([k]) => k !== "none" && k !== selectedSan)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    if (selectedSan === "none" || confidence < confidenceThreshold) {
      return {
        query: userQuery,
        matchedMove: null,
        san: selectedSan,
        confidence,
        probabilities,
        clarificationNeeded: true,
        alternativeCandidates: sortedOptions.slice(0, 3),
      };
    }

    const matched = candidates.find((c) => c.san === selectedSan) ?? null;

    return {
      query: userQuery,
      matchedMove: matched,
      san: selectedSan,
      confidence,
      probabilities,
      clarificationNeeded: false,
      alternativeCandidates: sortedOptions.slice(0, 2),
    };
  }
}
