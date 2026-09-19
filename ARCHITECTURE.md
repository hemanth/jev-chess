# Architectural Design: Chess Moves & Games with TypeSafe AI

## 1. Executive Summary & Core Philosophy

Building chess software with AI has historically faced two opposite extremes:
1. **Classical Chess Engines (Stockfish, Komodo):** Masterful at minimax tree search and bitboard physics, but opaque and purely numeric. A scalar evaluation like `+1.4` cannot explain *why* a move is stylistically brilliant, prophylactic, psychological, or intuitive.
2. **Generative LLMs (System Two / Chatbots):** Prone to hallucinating illegal coordinates, moving through pieces, losing track of castling rights, and taking 2–5 seconds with high token costs.

**TypeSafe AI (System One / Jev)** introduces a third, superior paradigm: **AI-Powered Software**.

```
┌────────────────────────────────────────────────────────┐
│                   DETERMINISTIC CODE                   │
│   • Board Physics & Move Legality (chess.js / bitboard)│
│   • FEN / SAN / PGN Parsing & Clock Management         │
│   • Check, Checkmate & Draw Detection                  │
└───────────────────────────┬────────────────────────────┘
                            │ Structured State Context
                            ▼
┌────────────────────────────────────────────────────────┐
│             TYPESAFE SYSTEM ONE (jev-latest)           │
│   • Fast (~100ms) Semantic & Qualitative Judgments     │
│   • Typed Primitives: Choice, Score, Noul               │
│   • Calibrated Probabilities & Peaked Confidence       │
│   • 100% Guaranteed Schema Conformance                 │
└───────────────────────────┬────────────────────────────┘
                            │ Typed Judgments
                            ▼
┌────────────────────────────────────────────────────────┐
│                APPLICATION ORCHESTRATION               │
│   • Natural Language Move Selection (Confidence-Gated) │
│   • Persona-Driven AI Opponents (Composite Scoring)    │
│   • Dynamic Commentary Badges & Game Tension Tracking  │
│   • Post-Game Blunder Diagnostics & Mistake Taxonomy   │
└────────────────────────────────────────────────────────┘
```

> **The Golden Rule:** Keep deterministic rules, execution, calculations, and side-effects in code. Insert System One where semantic understanding, natural language, and human common-sense judgment are needed.

---

## 2. Designing Chess Moves (The Atomic Level)

### 2.1 State Representation
State is the context presented to Jev. In chess, raw board graphics or cryptic FEN strings alone lack the semantic relationships the model needs. We structure the state cleanly into typed JSON:

```json
{
  "user_intent": "Develop my knight to attack their e5 pawn",
  "board": {
    "turn": "white",
    "move_number": 2,
    "in_check": false,
    "material_balance": "Equal",
    "game_phase": "opening",
    "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
  },
  "legal_moves": [
    { "san": "Nf3", "description": "Knight on g1 moves to f3" },
    { "san": "Nc3", "description": "Knight on b1 moves to c3" },
    { "san": "d4",  "description": "Pawn on d2 moves to d4" }
  ]
}
```

### 2.2 Pattern 1: Move Intent Resolution ("Select Instead of Generate")
Traditional chatbot interfaces try to make LLMs generate algebraic notation directly from text (e.g. "play e4"), which fails when positions get complicated. 
With TypeSafe, we use the **Select Instead of Generate** pattern:
1. Code deterministically generates all legal moves in the current position.
2. Jev selects from the candidate pool using `Choice`.
3. If the user command is vague or illegal, Jev returns `none` or a low confidence score, triggering an interactive clarification prompt in code.

```typescript
const response = await client.systemOne({
  state,
  questions: {
    matched_move: choice(
      "Which legal chess move in `legal_moves` best fulfills the player's command in `user_intent`?",
      criteria
    ),
  },
});

// Confidence-Gated Ambiguity Resolution
if (response.answers.matched_move.choice === "none" || response.answers.matched_move.confidence < 0.6) {
  promptUserForDisambiguation(response.answers.matched_move.probabilities);
} else {
  engine.makeMove(response.answers.matched_move.choice);
}
```

### 2.3 Pattern 2: Multi-Dimensional Qualitative Assessment
To explain moves to humans or show real-time broadcast commentary, we ask **parallel atomic questions** over the same state:

| Dimension | Primitive | Levels / Criteria |
| :--- | :--- | :--- |
| **Tactical Sharpness** | `Score` (0-3) | 0: Quiet/prophylactic, 1: Solid consolidation, 2: Sharp tension, 3: Explosive sacrifice |
| **Strategic Theme** | `Choice` | `pawn_break`, `piece_activation`, `prophylaxis`, `tactical_strike`, `king_hunt`, `simplification` |
| **King Threat** | `Noul` (0.0-1.0) | Probability the move initiates a direct assault on the opposing monarch |
| **Psychological Pressure** | `Noul` (0.0-1.0) | Probability the move provokes tactical panic or forces narrow only-moves |

All 4 questions are evaluated in parallel in **one single network call (~100ms)**.

---

## 3. Designing Chess Games (The System Level)

### 3.1 Pattern 3: Persona Opponents via Composite Scoring
How do you build AI opponents that play with the distinct personalities of Mikhail Tal, Tigran Petrosian, or Jose Raul Capablanca without training expensive models?

Use the **Composite Scoring Pattern**:
1. For each candidate move, compute atomic scores:
   - `aggression` (`Score` 0–3)
   - `prophylaxis` (`Score` 0–3)
   - `complexity` (`Score` 0–3)
   - `material_greed` (`Noul` 0–1)
2. Define client-side weight vectors for each persona:
   - **Mikhail Tal (The Magician from Riga):**
     $$\text{Score} = 0.45 \cdot \text{agg} - 0.15 \cdot \text{pro} + 0.50 \cdot \text{comp} - 0.20 \cdot \text{greed}$$
   - **Tigran Petrosian (Iron Tigran):**
     $$\text{Score} = 0.05 \cdot \text{agg} + 0.65 \cdot \text{pro} - 0.30 \cdot \text{comp} + 0.20 \cdot \text{greed}$$
   - **José Raúl Capablanca (The Chess Machine):**
     $$\text{Score} = 0.20 \cdot \text{agg} + 0.35 \cdot \text{pro} - 0.40 \cdot \text{comp} + 0.45 \cdot \text{greed}$$
3. Code selects the move with the highest composite score.

> [!TIP]
> **Zero Inference Rerun:** If you want to make Mikhail Tal 15% more wild or Petrosian 10% more cautious, you simply adjust the weights in client code. The underlying model judgments remain reusable and unchanged.

### 3.2 Pattern 4: Post-Game Blunder & Tactical Review (The Cascade Pattern)
When an evaluation drops or a blunder occurs, traditional engines output a cold numeric penalty (`-4.2`). TypeSafe runs a diagnostic cascade:
- `Choice(mistake_archetype)`:
  - `tactical_blindness` (missed a fork, pin, skewer)
  - `poisoned_pawn_greed` (grabbed pawns while king was exposed)
  - `over_extension` (pushed pawns without support)
  - `passive_concession` (yielded tempo and space)
  - `king_safety_negligence` (compromised shelter)
- `Score(defensive_difficulty)`:
  - 0: Simple defense $\rightarrow$ 3: Hopeless human defense
- Code maps the typed diagnosis directly into actionable coaching advice.

---

## 4. Verification & Testing Standards

All move selection and game orchestration pipelines must obey three non-negotiable guarantees:
1. **Zero Illegal Moves:** Every move presented to or selected by TypeSafe originates from the deterministic legal move generator.
2. **Deterministic Schema Safety:** No regex parsing of LLM markdown or JSON extraction blocks. System One returns typed fields directly.
3. **Graceful Degraded Mode:** If network connection or API keys are absent, the system falls back to calibrated simulation while preserving identical schemas.
