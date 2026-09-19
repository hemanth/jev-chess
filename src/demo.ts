import { ChessEngine } from "./chessEngine.js";
import { MoveResolver } from "./moveResolver.js";
import { MoveEvaluator } from "./moveEvaluator.js";
import { PersonaEngine, CHESS_PERSONAS } from "./personaEngine.js";
import { GameReviewer } from "./gameReviewer.js";
import { getTypeSafeClient } from "./typeSafeClient.js";

async function runDemo() {
  const client = getTypeSafeClient();
  console.log("================================================================================");
  console.log("   ♟️  JEV-CHESS: DESIGNING CHESS MOVES & GAMES WITH TYPESAFE AI  ♟️");
  console.log("================================================================================");
  console.log(`Backend Mode: ${client.isLive ? "🟢 LIVE (TypeSafe API - jev-latest)" : "🟡 SIMULATED (Calibrated offline fallback)"}`);
  console.log("Principle: Code enforces board physics & rules; TypeSafe System One provides fast semantic judgment.\n");

  const engine = new ChessEngine();

  // ---------------------------------------------------------------------------
  // SECTION 1: MOVE DESIGN - NATURAL LANGUAGE INTENT RESOLUTION
  // ---------------------------------------------------------------------------
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. MOVE RESOLUTION: 'Select Instead of Generate' Pattern (TypeSafe Choice)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Play standard 1. e4 e5
  engine.makeMove("e4");
  engine.makeMove("e5");
  console.log(`Current Board FEN: ${engine.fen()}`);
  console.log(`Turn: ${engine.turn()} | Move: 2\n`);

  const resolver = new MoveResolver();

  const queries = [
    "Develop my knight towards the center and attack their pawn",
    "Push the queen's pawn two squares forward to contest the center",
    "Teleport my rook directly to the other side", // Intent with no legal match
  ];

  for (const q of queries) {
    console.log(`> Human command: "${q}"`);
    const result = await resolver.resolveIntent(engine, q);
    if (result.matchedMove) {
      console.log(`  ✅ Matched Legal Move: ${result.matchedMove.san} (${result.matchedMove.description})`);
      console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    } else {
      console.log(`  ⚠️ Ambiguous or Illegal Command!`);
      console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}% (Clarification Required)`);
      if (result.alternativeCandidates.length > 0) {
        console.log(`     Did you mean: ${result.alternativeCandidates.join(", ")}?`);
      }
    }
    console.log();
  }

  // Play White 2. Nf3, Black 2. Nc6, White 3. Bc4, Black 3. Bc5
  engine.makeMove("Nf3");
  engine.makeMove("Nc6");
  engine.makeMove("Bc4");
  engine.makeMove("Bc5");

  // ---------------------------------------------------------------------------
  // SECTION 2: MOVE DESIGN - MULTI-DIMENSIONAL QUALITATIVE EVALUATION
  // ---------------------------------------------------------------------------
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("2. MOVE EVALUATION: Parallel Atomic Judgments (Score, Choice, Noul)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const evaluator = new MoveEvaluator();
  const testMoves = ["c3", "O-O", "Bxf7+"];

  for (const san of testMoves) {
    // Check if legal in current or alternate position
    const candidates = engine.getAnnotatedMoves();
    let moveObj = candidates.find((m) => m.san === san);
    if (!moveObj) {
      // Create synthetic candidate for demonstration if not currently legal
      moveObj = {
        san,
        from: "c2",
        to: "c3",
        piece: "pawn",
        color: "white",
        isCapture: san.includes("x"),
        isCheck: san.includes("+"),
        isCastling: san === "O-O",
        description: san === "O-O" ? "Kingside castle" : `Move ${san}`,
      };
    }

    const evalResult = await evaluator.evaluateMove(engine, moveObj);
    console.log(`Move: ${evalResult.san}`);
    console.log(`  Badge:                  ${evalResult.commentaryBadge}`);
    console.log(`  Tactical Sharpness:     ${evalResult.tacticalSharpness.score.toFixed(1)} / 3.0 (${evalResult.tacticalSharpness.level})`);
    console.log(`  Strategic Theme:        ${evalResult.strategicTheme.theme} (Confidence: ${(evalResult.strategicTheme.confidence * 100).toFixed(0)}%)`);
    console.log(`  King Attack Threat:     ${(evalResult.kingAttackRisk.probability * 100).toFixed(0)}%`);
    console.log(`  Psychological Pressure: ${(evalResult.psychologicalPressure.probability * 100).toFixed(0)}%`);
    console.log();
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: GAME DESIGN - PERSONA AI OPPONENTS VIA COMPOSITE SCORING
  // ---------------------------------------------------------------------------
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("3. GAME DESIGN: Persona AI Opponents via Composite Scoring");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Demonstrating how atomic scores are re-weighted in code to produce distinct personalities without rerunning inference:\n");

  const personaEngine = new PersonaEngine();
  const personas: Array<keyof typeof CHESS_PERSONAS> = ["tal", "petrosian", "capablanca", "coffeehouse"];

  for (const pId of personas) {
    const decision = await personaEngine.selectMove(engine, pId, 4);
    const p = decision.persona;
    console.log(`👤 ${p.name} - "${p.title}"`);
    console.log(`   Weights: Aggression=${p.weights.aggression}, Prophylaxis=${p.weights.prophylaxis}, Complexity=${p.weights.complexity}, Greed=${p.weights.materialGreed}`);
    console.log(`   Decision: Plays ${decision.selectedMove.san} (${decision.selectedMove.description})`);
    console.log(`   Top 3 Ranked Moves:`);
    for (let i = 0; i < Math.min(3, decision.rankedCandidates.length); i++) {
      const c = decision.rankedCandidates[i]!;
      console.log(`     #${i + 1} ${c.move.san.padEnd(5)} | Composite Score: ${c.compositeScore.toFixed(3)} (Agg:${c.dimensionScores.aggression.toFixed(1)}, Pro:${c.dimensionScores.prophylaxis.toFixed(1)}, Comp:${c.dimensionScores.complexity.toFixed(1)}, Greed:${c.dimensionScores.materialGreed.toFixed(2)})`);
    }
    console.log();
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: GAME REVIEW - POST-GAME BLUNDER TAXONOMY & DIAGNOSTICS
  // ---------------------------------------------------------------------------
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("4. GAME REVIEW: Structured Mistake Diagnostics (The Cascade Pattern)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const reviewer = new GameReviewer();
  const sampleBlunder = {
    san: "Qxh7??",
    from: "d3",
    to: "h7",
    piece: "queen",
    color: "white" as const,
    isCapture: true,
    isCheck: false,
    isCastling: false,
    description: "Queen captures h7 pawn without checking king safety",
  };

  const diagnosis = await reviewer.diagnoseMove(engine, sampleBlunder, 14);
  console.log(`Reviewed Move: Move ${diagnosis.moveNumber} White played ${diagnosis.playedMove}`);
  console.log(`  Mistake Taxonomy:    ${diagnosis.mistakeArchetype.toUpperCase()}`);
  console.log(`  Defensive Difficulty: ${diagnosis.defensiveDifficulty.toFixed(1)} / 3.0`);
  console.log(`  Game Tension Level:   ${diagnosis.tacticalTension.toFixed(1)} / 3.0`);
  console.log(`  Coach Feedback:       "${diagnosis.coachAdvice}"\n`);

  console.log("================================================================================");
  console.log("   ✅ TypeSafe Chess Moves and Games Architecture demonstrated successfully!    ");
  console.log("================================================================================");
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
