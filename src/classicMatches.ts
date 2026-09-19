import { ChessEngine } from "./chessEngine.js";
import { choice, getTypeSafeClient, noul, score } from "./typeSafeClient.js";

export interface ClassicMatch {
  id: string;
  title: string;
  white: string;
  black: string;
  year: number;
  event: string;
  result: "1-0" | "0-1" | "1/2-1/2";
  eco: string;
  opening: string;
  description: string;
  moves: string[]; // SAN moves
  keyMoveIndex: number; // Index of the iconic turning point move
}

export interface MatchClassification {
  matchId: string;
  title: string;
  archetype: string;
  aestheticBrilliance: {
    score: number;
    level: string;
    confidence: number;
  };
  overallSharpness: {
    score: number;
    level: string;
  };
  hasDecisiveSacrifice: boolean;
  turningPoint: {
    moveNumber: number;
    san: string;
    annotation: string;
  };
  strategicBreakdown: {
    tacticalStrikesPct: number;
    pawnBreaksPct: number;
    prophylaxisPct: number;
    pieceActivationPct: number;
  };
  verdict: string;
}

export const CLASSIC_MATCHES: ClassicMatch[] = [
  {
    id: "immortal-game",
    title: "The Immortal Game",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    year: 1851,
    event: "London (Casual match during 1st International Tournament)",
    result: "1-0",
    eco: "C33",
    opening: "King's Gambit Accepted",
    description:
      "Anderssen gave up both rooks and a bishop, followed by his queen, delivering checkmate with his three remaining minor pieces.",
    keyMoveIndex: 38, // 20. Ke2! or 22. Qf6+!
    moves: [
      "e4", "e5", "f4", "exf4", "Bc4", "Qh4+", "Kf1", "b5", "Bxb5", "Nf6",
      "Nf3", "Qh6", "d3", "Nh5", "Nh4", "Qg5", "Nf5", "c6", "g4", "Nf6",
      "Rg1", "cxb5", "h4", "Qg6", "h5", "Qg5", "Qf3", "Ng8", "Bxf4", "Qf6",
      "Nc3", "Bc5", "Nd5", "Qxb2", "Bd6", "Bxg1", "e5", "Qxa1+", "Ke2", "Na6",
      "Nxg7+", "Kd8", "Qf6+", "Nxf6", "Be7#"
    ],
  },
  {
    id: "opera-game",
    title: "The Opera Game",
    white: "Paul Morphy",
    black: "Duke of Brunswick & Count Isouard",
    year: 1858,
    event: "Paris Opera House (Norma intermission)",
    result: "1-0",
    eco: "C41",
    opening: "Philidor Defense",
    description:
      "Morphy's quintessential demonstration of rapid development, open lines, and deflection queen sacrifice ending in checkmate with rook and bishop.",
    keyMoveIndex: 30, // 16. Qb8+!
    moves: [
      "e4", "e5", "Nf3", "d6", "d4", "Bg4", "dxe5", "Bxf3", "Qxf3", "dxe5",
      "Bc4", "Nf6", "Qb3", "Qe7", "Nc3", "c6", "Bg5", "b5", "Nxb5", "cxb5",
      "Bxb5+", "Nbd7", "O-O-O", "Rd8", "Rxd7", "Rxd7", "Rd1", "Qe6", "Bxd7+", "Nxd7",
      "Qb8+", "Nxb8", "Rd8#"
    ],
  },
  {
    id: "game-of-the-century",
    title: "Game of the Century",
    white: "Donald Byrne",
    black: "Bobby Fischer (age 13)",
    year: 1956,
    event: "Rosenwald Memorial Tournament, New York",
    result: "0-1",
    eco: "D92",
    opening: "Grünfeld Defence, 5.Bf4",
    description:
      "A 13-year-old Bobby Fischer sacrifices his queen on move 17 (Be6!!) to unleash an unstoppable windmill attack with bishop and knight.",
    keyMoveIndex: 33, // 17... Be6!!
    moves: [
      "Nf3", "Nf6", "c4", "g6", "Nc3", "Bg7", "d4", "O-O", "Bf4", "d5",
      "Qb3", "dxc4", "Qxc4", "c6", "e4", "Nbd7", "Rd1", "Nb6", "Qc5", "Bg4",
      "Bg5", "Na4", "Qa3", "Nxc3", "bxc3", "Nxe4", "Bxe7", "Qb6", "Bc4", "Nxc3",
      "Bc5", "Rfe8+", "Kf1", "Be6", "Bxb6", "Bxc4+", "Kg1", "Ne2+", "Kf1", "Nxd4+",
      "Kg1", "Ne2+", "Kf1", "Nc3+", "Kg1", "axb6", "Qb4", "Ra4", "Qxb6", "Nxd1",
      "h3", "Rxa2", "Kh2", "Nxf2", "Re1", "Rxe1", "Qd8+", "Bf8", "Nxe1", "Bd5",
      "Nf3", "Ne4", "Qb8", "b5", "h4", "h5", "Ne5", "Kg7", "Kg1", "Bc5+",
      "Kf1", "Ng3+", "Ke1", "Bb4+", "Kd1", "Bb3+", "Kc1", "Ne2+", "Kb1", "Nc3+",
      "Kc1", "Rc2#"
    ],
  },
  {
    id: "kasparov-immortal",
    title: "Kasparov's Immortal",
    white: "Garry Kasparov",
    black: "Veselin Topalov",
    year: 1999,
    event: "Hoogovens Group A, Wijk aan Zee",
    result: "1-0",
    eco: "B07",
    opening: "Pirc Defense",
    description:
      "Kasparov sacrifices his rook on d4 (24. Rxd4!!) initiating a spectacular 15-move king hunt that drove the black king across the entire board.",
    keyMoveIndex: 46, // 24. Rxd4!!
    moves: [
      "e4", "d6", "d4", "Nf6", "Nc3", "g6", "Be3", "Bg7", "Qd2", "c6",
      "f3", "b5", "Nge2", "Nbd7", "Bh6", "Bxh6", "Qxh6", "Bb7", "a3", "e5",
      "O-O-O", "Qe7", "Kb1", "a6", "Nc1", "O-O-O", "Nb3", "exd4", "Rxd4", "c5",
      "Rd1", "Nb6", "g3", "Kb8", "Na5", "Ba8", "Bh3", "d5", "Qf4+", "Ka7",
      "Rhe1", "d4", "Nd5", "Nbxd5", "exd5", "Qd6", "Rxd4", "cxd4", "Re7+", "Kb6",
      "Qxd4+", "Kxa5", "b4+", "Ka4", "Qc3", "Qxd5", "Ra7", "Bb7", "Rxb7", "Qc4",
      "Qxf6", "Kxa3", "Qxa6+", "Kxb4", "c3+", "Kxc3", "Qa1+", "Kd2", "Qb2+", "Kd1",
      "Bf1", "Rd2", "Rd7+", "Rxd7", "Bxc4", "bxc4", "Qxh8", "Rd3", "Qa8", "c3",
      "Qa4+", "Ke1", "f4", "f5", "Kc1", "Rd2", "Qa7"
    ],
  },
  {
    id: "tal-larsen-1965",
    title: "Tal's Wild Central Sacrifice",
    white: "Mikhail Tal",
    black: "Bent Larsen",
    year: 1965,
    event: "Candidates Semifinal, Bled, Match Game 10",
    result: "1-0",
    eco: "B57",
    opening: "Sicilian Defense, Richter-Rauzer",
    description:
      "Tal's famous intuitive piece sacrifice 16. Nxd5!! blowing open the center against Larsen's uncastled king to clinch the match.",
    keyMoveIndex: 30, // 16. Nxd5!!
    moves: [
      "e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "e6", "Nc3", "d6",
      "Be3", "Nf6", "f4", "Be7", "Qf3", "O-O", "O-O-O", "Qc7", "Ndb5", "Qb8",
      "g4", "a6", "Nd4", "Nxd4", "Bxd4", "b5", "g5", "Nd7", "Bd3", "b4",
      "Nd5", "exd5", "exd5", "f5", "Rde1", "Rf7", "h4", "Bb7", "Bxf5", "Rxf5",
      "Rxe7", "Ne5", "Qe4", "Qf8", "fxe5", "Rf4", "Qe3", "Rf3", "Qe2", "Qxe7",
      "Qxf3", "dxe5", "Re1", "Rd8", "Rxe5", "Qd6", "Qf4", "Rf8", "Qe4", "Bc8",
      "b3", "a5", "h5", "Bd7", "h6"
    ],
  },
];

const MATCH_ARCHETYPES = {
  romantic_swashbuckler: "Cascading material sacrifices culminating in a forced mating net",
  dynamic_initiative: "Relentless piece tempo and coordinated piece pressure dominating passive defenders",
  positional_squeeze: "Prophylactic clamp, suffocating opponent counterplay before technical breakthrough",
  tactical_firestorm: "Sharp double-edged complications with king chases and critical calculate-or-die tactics",
};

const BRILLIANCE_RUBRIC = [
  "Standard technical victory with routine exchanges",
  "Well-played competitive game with solid tactical execution",
  "Brilliant game featuring deep calculation and attractive piece play",
  "Immortal artistic masterpiece that redefined chess literature",
] as const;

const MATCH_SHARPNESS_RUBRIC = [
  "Solid and quiet; long positional maneuvering behind closed pawns",
  "Balanced fighting contest with strategic tension",
  "Very sharp; frequent piece contact, king exposure, and tactical threats",
  "Wild tactical hurricane; mutual piece sacrifices and all-out monarch assault",
] as const;

export class ClassicMatchStudio {
  private get client() {
    return getTypeSafeClient();
  }

  /**
   * Classifies a classic chess match using TypeSafe System One.
   */
  public async classifyMatch(match: ClassicMatch): Promise<MatchClassification> {
    const turningMove = match.moves[match.keyMoveIndex] ?? match.moves[match.moves.length - 1] ?? "e4";
    const moveNum = Math.floor((match.keyMoveIndex) / 2) + 1;

    const state = {
      match_meta: {
        id: match.id,
        title: match.title,
        white: match.white,
        black: match.black,
        year: match.year,
        eco: match.eco,
        opening: match.opening,
        result: match.result,
        total_moves: match.moves.length,
      },
      turning_point: {
        move_number: moveNum,
        san: turningMove,
        description: match.description,
      },
      moves_sample: match.moves.slice(0, 30),
    };

    const response = await this.client.systemOne({
      state,
      questions: {
        archetype: choice(
          "Which historical chess archetype best classifies `match_meta.title`?",
          MATCH_ARCHETYPES
        ),
        brilliance: score(
          "Rate the aesthetic and instructive brilliance of this classic match:",
          BRILLIANCE_RUBRIC
        ),
        sharpness: score(
          "Rate the overall tactical sharpness and volatility of this game:",
          MATCH_SHARPNESS_RUBRIC
        ),
        decisive_sacrifice: noul(
          "Does this match feature a sound, decisive piece or queen sacrifice for the initiative?"
        ),
      },
    });

    const archetype = response.answers.archetype.choice;
    const brillianceScore = response.answers.brilliance.score;
    const sharpnessScore = response.answers.sharpness.score;
    const hasSac = response.answers.decisive_sacrifice.noul >= 0.6;

    // Deterministically count tactical themes from move properties
    let checksAndCaptures = 0;
    let pawnMoves = 0;
    for (const m of match.moves) {
      if (m.includes("+") || m.includes("x") || m.includes("#")) checksAndCaptures++;
      else if (m.toLowerCase()[0] >= "a" && m.toLowerCase()[0] <= "h" && !m.includes("O")) pawnMoves++;
    }
    const total = Math.max(1, match.moves.length);
    const tacticalPct = Math.round((checksAndCaptures / total) * 100);
    const pawnPct = Math.round((pawnMoves / total) * 100);
    const piecePct = Math.max(10, 100 - tacticalPct - pawnPct);
    const prophylPct = Math.round(piecePct * 0.35);

    let verdict = `${match.title} (${match.year}) is a classic ${archetype.replace(/_/g, " ")}. `;
    if (brillianceScore >= 2.3) {
      verdict += "Widely celebrated as one of the finest artistic achievements in the history of the game.";
    } else {
      verdict += "A deeply instructive showcase of classical principles and aggressive tactical conversion.";
    }

    return {
      matchId: match.id,
      title: match.title,
      archetype: archetype.replace(/_/g, " ").toUpperCase(),
      aestheticBrilliance: {
        score: brillianceScore,
        level: BRILLIANCE_RUBRIC[Math.min(BRILLIANCE_RUBRIC.length - 1, Math.round(brillianceScore))] ?? "Masterpiece",
        confidence: response.answers.brilliance.confidence,
      },
      overallSharpness: {
        score: sharpnessScore,
        level: MATCH_SHARPNESS_RUBRIC[Math.min(MATCH_SHARPNESS_RUBRIC.length - 1, Math.round(sharpnessScore))] ?? "Sharp",
      },
      hasDecisiveSacrifice: hasSac,
      turningPoint: {
        moveNumber: moveNum,
        san: turningMove,
        annotation: match.description,
      },
      strategicBreakdown: {
        tacticalStrikesPct: tacticalPct,
        pawnBreaksPct: pawnPct,
        prophylaxisPct: prophylPct,
        pieceActivationPct: piecePct,
      },
      verdict,
    };
  }
}
