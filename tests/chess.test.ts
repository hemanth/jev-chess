import { describe, it, expect } from "vitest";
import { ChessEngine } from "../src/chessEngine.js";
import { MoveResolver } from "../src/moveResolver.js";
import { MoveEvaluator } from "../src/moveEvaluator.js";
import { PersonaEngine, CHESS_PERSONAS } from "../src/personaEngine.js";
import { GameReviewer } from "../src/gameReviewer.js";
import { ClassicMatchStudio, CLASSIC_MATCHES } from "../src/classicMatches.js";

describe("ChessEngine Deterministic Rules", () => {
  it("should initialize board to standard starting position", () => {
    const engine = new ChessEngine();
    expect(engine.turn()).toBe("white");
    expect(engine.isCheck()).toBe(false);
    expect(engine.isGameOver()).toBe(false);

    const moves = engine.getAnnotatedMoves();
    expect(moves.length).toBe(20); // 16 pawn moves + 4 knight moves
  });

  it("should calculate equal material at start", () => {
    const engine = new ChessEngine();
    const balance = engine.getMaterialBalance();
    expect(balance.diff).toBe(0);
    expect(balance.description).toContain("equal");
  });

  it("should apply legal moves and update state", () => {
    const engine = new ChessEngine();
    const move = engine.makeMove("e4");
    expect(move).not.toBeNull();
    expect(move?.san).toBe("e4");
    expect(engine.turn()).toBe("black");
  });

  it("should reject illegal moves", () => {
    const engine = new ChessEngine();
    const illegalMove = engine.makeMove("e5");
    expect(illegalMove).toBeNull();
  });
});

describe("MoveResolver (TypeSafe Choice & Confidence Gating)", () => {
  const engine = new ChessEngine();
  const resolver = new MoveResolver();

  it("should resolve knight development to Nf3", async () => {
    engine.reset();
    engine.makeMove("e4");
    engine.makeMove("e5");

    const res = await resolver.resolveIntent(
      engine,
      "Develop my knight towards the center and attack their pawn"
    );
    expect(res.matchedMove).not.toBeNull();
    expect(res.san).toBe("Nf3");
    expect(res.confidence).toBeGreaterThan(0.5);
    expect(res.clarificationNeeded).toBe(false);
  });

  it("should resolve pawn push to d4", async () => {
    engine.reset();
    engine.makeMove("e4");
    engine.makeMove("e5");

    const res = await resolver.resolveIntent(
      engine,
      "Push the queen's pawn two squares forward"
    );
    expect(res.matchedMove).not.toBeNull();
    expect(res.san).toBe("d4");
  });

  it("should flag clarification for impossible commands", async () => {
    engine.reset();
    const res = await resolver.resolveIntent(
      engine,
      "Teleport my queen straight to the enemy backrank"
    );
    expect(res.clarificationNeeded).toBe(true);
    expect(res.matchedMove).toBeNull();
    expect(res.confidence).toBeLessThan(0.55);
  });
});

describe("MoveEvaluator (Parallel Atomic Judgments)", () => {
  const engine = new ChessEngine();
  const evaluator = new MoveEvaluator();

  it("should score quiet castling as low sharpness", async () => {
    engine.reset();
    // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O
    engine.makeMove("e4");
    engine.makeMove("e5");
    engine.makeMove("Nf3");
    engine.makeMove("Nc6");
    engine.makeMove("Bc4");
    engine.makeMove("Bc5");

    const castleMove = engine.getAnnotatedMoves().find((m) => m.san === "O-O")!;
    const evalRes = await evaluator.evaluateMove(engine, castleMove);

    expect(evalRes.tacticalSharpness.score).toBeLessThan(1.5);
    expect(evalRes.san).toBe("O-O");
  });

  it("should score tactical sacrifice as high sharpness", async () => {
    engine.reset();
    engine.makeMove("e4");
    engine.makeMove("e5");
    engine.makeMove("Nf3");
    engine.makeMove("Nc6");
    engine.makeMove("Bc4");
    engine.makeMove("Bc5");

    const sacMove = engine.getAnnotatedMoves().find((m) => m.san === "Bxf7+")!;
    const evalRes = await evaluator.evaluateMove(engine, sacMove);

    expect(evalRes.tacticalSharpness.score).toBeGreaterThan(2.0);
    expect(evalRes.commentaryBadge).toContain("Sharp");
  });
});

describe("PersonaEngine (Composite Scoring)", () => {
  const engine = new ChessEngine();
  const personaEngine = new PersonaEngine();

  it("should have distinct weights for Tal and Petrosian", () => {
    const tal = CHESS_PERSONAS.tal;
    const petrosian = CHESS_PERSONAS.petrosian;

    expect(tal.weights.aggression).toBeGreaterThan(petrosian.weights.aggression);
    expect(petrosian.weights.prophylaxis).toBeGreaterThan(tal.weights.prophylaxis);
  });

  it("should select moves and rank candidates by composite score", async () => {
    engine.reset();
    engine.makeMove("e4");
    engine.makeMove("e5");
    engine.makeMove("Nf3");
    engine.makeMove("Nc6");
    engine.makeMove("Bc4");
    engine.makeMove("Bc5");

    const talDecision = await personaEngine.selectMove(engine, "tal");
    expect(talDecision.selectedMove).toBeDefined();
    expect(talDecision.rankedCandidates.length).toBeGreaterThan(0);
    // Best move should have highest score
    expect(talDecision.rankedCandidates[0]?.compositeScore).toBeGreaterThanOrEqual(
      talDecision.rankedCandidates[1]?.compositeScore ?? -999
    );
  });
});

describe("GameReviewer (Mistake Diagnostics)", () => {
  const engine = new ChessEngine();
  const reviewer = new GameReviewer();

  it("should diagnose blunder move into actionable feedback", async () => {
    engine.reset();
    const blunder = {
      san: "Qxh7??",
      from: "d3",
      to: "h7",
      piece: "queen",
      color: "white" as const,
      isCapture: true,
      isCheck: false,
      isCastling: false,
      description: "Queen captures h7 pawn",
    };

    const diag = await reviewer.diagnoseMove(engine, blunder, 12);
    expect(diag.moveNumber).toBe(12);
    expect(diag.mistakeArchetype).toBe("king_safety_negligence");
    expect(diag.coachAdvice).toContain("king");
  });
});

describe("ClassicMatchStudio (Historic Game Classification)", () => {
  const matchStudio = new ClassicMatchStudio();

  it("should classify The Immortal Game as a romantic swashbuckler with high brilliance", async () => {
    const immortal = CLASSIC_MATCHES.find((m) => m.id === "immortal-game")!;
    expect(immortal).toBeDefined();

    const classification = await matchStudio.classifyMatch(immortal);
    expect(classification.matchId).toBe("immortal-game");
    expect(classification.archetype).toContain("SWASHBUCKLER");
    expect(classification.aestheticBrilliance.score).toBeGreaterThan(2.0);
    expect(classification.hasDecisiveSacrifice).toBe(true);
    expect(classification.turningPoint.san).toBe("Ke2");
    expect(classification.strategicBreakdown.tacticalStrikesPct).toBeGreaterThan(0);
  });

  it("should classify Kasparov's Immortal as tactical firestorm with sacrifice", async () => {
    const kasparov = CLASSIC_MATCHES.find((m) => m.id === "kasparov-immortal")!;
    expect(kasparov).toBeDefined();

    const classification = await matchStudio.classifyMatch(kasparov);
    expect(classification.matchId).toBe("kasparov-immortal");
    expect(classification.archetype).toContain("FIRESTORM");
    expect(classification.overallSharpness.score).toBeGreaterThan(2.0);
    expect(classification.turningPoint.san).toBe("Rxd4");
  });
});
