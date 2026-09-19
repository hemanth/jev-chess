# jev-chess

Chess moves, evaluations, persona opponents, and game classification using TypeSafe AI System One models.

```bash
npm install jev-chess
```

## Quick start

```ts
import { ChessEngine, MoveResolver, MoveEvaluator, PersonaEngine } from "jev-chess";

const engine = new ChessEngine();
const resolver = new MoveResolver();
const evaluator = new MoveEvaluator();
const personas = new PersonaEngine();

// Natural language intent -> verified legal move
const { matchedMove } = await resolver.resolveIntent(engine, "Develop knight to attack center");
const move = engine.makeMove(matchedMove.san);

// Parallel System One evaluation
const evalResult = await evaluator.evaluateMove(engine, move);
console.log(`${move.san}: ${evalResult.commentaryBadge} (Sharpness: ${evalResult.tacticalSharpness.score}/3.0)`);

// Opponent response via composite scoring
const { selectedMove, rationale } = await personas.selectMove(engine, "tal");
engine.makeMove(selectedMove.san);
console.log(`Tal plays ${selectedMove.san}: ${rationale}`);
```

`resolveIntent()` maps natural language to verified legal moves via `Choice`. `evaluateMove()` assesses sharpness, strategic themes, and king risk in parallel. `selectMove()` weighs candidates against persona archetypes. That's the whole loop.

## Natural language move intent

```ts
const { matchedMove, confidence, alternativeCandidates } = await resolver.resolveIntent(
  engine,
  "Castle kingside to safety"
);

if (matchedMove && confidence > 0.6) {
  engine.makeMove(matchedMove.san);
}
```

Resolves ambiguous instructions against verified legal moves instead of generating coordinates from scratch. If confidence falls below threshold, it returns candidate alternatives rather than hallucinating illegal squares.

## Parallel move evaluation

```ts
const evaluation = await evaluator.evaluateMove(engine, move);

// evaluation.tacticalSharpness -> Score (0.0 to 3.0)
// evaluation.strategicTheme    -> Choice (pawn_break, tactical_strike, prophylaxis, etc.)
// evaluation.kingAttackRisk    -> Noul (0.0 to 1.0 probability)
// evaluation.commentaryBadge   -> "Sharp Tactical Clash"
```

A single `systemOne()` call evaluates candidate moves across four orthogonal dimensions simultaneously. Deterministic code synthesizes the results into human-readable commentary without asking an LLM to generate prose.

## Persona AI opponents

```ts
const decision = await personas.selectMove(engine, "tal");
// or "petrosian", "capablanca", "coffeehouse"
```

Personas are client-side weight vectors over atomic System One dimensions:

- **Tal**: Heavy weight on tactical sharpness, king attack, and psychological pressure
- **Petrosian**: Dominant prophylaxis and king safety weights
- **Capablanca**: Prioritizes simplification and clear piece coordination
- **Coffeehouse**: Romantic gambiteer favoring king assault and complications

## Historic game classification

```ts
import { ClassicMatchStudio, CLASSIC_MATCHES } from "jev-chess";

const studio = new ClassicMatchStudio();
const report = await studio.classifyMatch(CLASSIC_MATCHES[0]);

console.log(report.archetype);            // "ROMANTIC SWASHBUCKLER"
console.log(report.aestheticBrilliance);   // { score: 2.9, level: "Immortal artistic masterpiece..." }
console.log(report.turningPoint);         // { moveNumber: 20, san: "Ke2", ... }
```

Classifies full games into historical archetypes, detects turning points, verifies sacrifices, and generates structural tension breakdowns.

## Studio & demo

```bash
npm run demo     # Interactive terminal showcase
npm run serve    # Browser studio on http://localhost:3333
```

Interactive studio with board replay, real-time move intelligence, dynamic API key configuration, and classic match recreations.

## Related

- [TypeSafe AI](https://typesafe.ai) — Small units of AI intelligence as programming primitives
- [TypeSafe SDK](https://github.com/typesafe-ai/typesafe-sdk) — Official TypeScript SDK
- [Architecture Manifesto](./ARCHITECTURE.md) — Architectural pattern for TypeSafe chess software

## License

MIT © [Hemanth.HM](https://h3manth.com)
