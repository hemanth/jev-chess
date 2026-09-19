# ♟️ Jev-Chess: Designing Chess Moves & Games with TypeSafe AI

> **A Reference Architecture for AI-Powered Software in Chess using TypeSafe's System One Model (`jev-latest`)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![TypeSafe SDK](https://img.shields.io/badge/@typesafe--ai/sdk-0.6.0-orange.svg)](https://docs.typesafe.ai)
[![Tests](https://img.shields.io/badge/tests-12%20passed-brightgreen.svg)]()

---

## 🌟 Core Concept

Traditional chess software is divided into two flawed paradigms:
1. **Classical Engines (Stockfish):** Flawless calculation, but zero understanding of human psychology, style, natural language, or thematic concepts.
2. **Generative LLMs (ChatGPT/Claude):** Prone to hallucinating illegal moves, confusing square coordinates, and taking 2–5 seconds with high costs.

**Jev-Chess** demonstrates the **TypeSafe AI (System One)** architectural pattern:
- **Code owns the rules and board physics** (100% legal moves via `chess.js`, bitboards, FEN, PGN, timers).
- **TypeSafe System One (`jev-latest`) owns the semantic judgments** (fast ~100ms structured evaluations via `Choice`, `Score`, and `Noul`).

---

## 🚀 Key Patterns Implemented

| Pattern | TypeSafe Primitive | Description |
| :--- | :--- | :--- |
| **Move Intent Resolution** | `Choice` + Confidence | Natural language move execution (*"Push king's pawn two squares"*) mapped to verified legal moves with fallback disambiguation. |
| **Move Character & Theme** | `Score` + `Choice` + `Noul` | Parallel atomic evaluation of tactical sharpness, strategic motifs (`pawn_break`, `prophylaxis`), and king threats. |
| **Persona AI Opponents** | `Score` + Composite Scoring | Playing styles of **Mikhail Tal**, **Tigran Petrosian**, **Capablanca**, and **Coffeehouse Gambiteer** created via client-side weight vectors over atomic scores. |
| **Blunder Taxonomy Review** | `Choice` + `Score` Cascade | Structured post-game diagnostics classifying blunders into actionable human archetypes (`tactical_blindness`, `over_extension`, `poisoned_pawn_greed`). |

---

## 📦 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. (Optional) Set TypeSafe API Key
To run against the live TypeSafe cloud model (`jev-latest`), set your key:
```bash
export TYPESAFE_API_KEY="ts_your_api_key_here"
```
*Note: If no API key is provided, the engine automatically runs in **calibrated offline simulation mode**, providing realistic outputs with identical schemas.*

### 3. Run the Interactive Demo
```bash
npm run demo
```

### 4. Run the Test Suite
```bash
npm test
```

### 5. Build TypeScript
```bash
npm run build
```

---

## 🏗️ Code Structure

```
jev-chess/
├── ARCHITECTURE.md          # Complete design manifesto & specification
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # Library exports
│   ├── types.ts             # Domain models (moves, board, personas, evaluations)
│   ├── chessEngine.ts       # Deterministic chess rules wrapper (chess.js)
│   ├── typeSafeClient.ts    # TypeSafe SDK wrapper (live API + simulation fallback)
│   ├── moveResolver.ts      # Natural language -> Legal move (Choice)
│   ├── moveEvaluator.ts     # Multi-dimensional move assessment (Parallel System One)
│   ├── personaEngine.ts     # Multi-persona AI via composite scoring
│   ├── gameReviewer.ts      # Blunder diagnostics & game tension tracking
│   ├── classicMatches.ts    # Recreate historic games & System One classification
│   └── demo.ts              # Interactive CLI showcase
└── tests/
    └── chess.test.ts        # Unit & integration test suite (14 tests)
```

---

## 💡 Code Example: Persona Move Selection

```typescript
import { ChessEngine, PersonaEngine } from "jev-chess";

const engine = new ChessEngine();
engine.makeMove("e4");
engine.makeMove("e5");

const personaEngine = new PersonaEngine();

// Select move as Mikhail Tal (High aggression & chaos)
const talMove = await personaEngine.selectMove(engine, "tal");
console.log(`Tal plays: ${talMove.selectedMove.san}`);

// Select move as Tigran Petrosian (High prophylaxis & safety)
const petrosianMove = await personaEngine.selectMove(engine, "petrosian");
console.log(`Petrosian plays: ${petrosianMove.selectedMove.san}`);
```

---

## 📖 Learn More
- [Complete Architecture Manifesto](./ARCHITECTURE.md)
- [TypeSafe Documentation](https://docs.typesafe.ai)
- [System One Concepts](https://docs.typesafe.ai/concepts/system-one)
