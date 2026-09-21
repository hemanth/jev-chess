import {
  TypeSafeClient,
  choice,
  score,
  noul,
  type Questions,
  type SystemOneRequest,
  type SystemOneResult,
} from "@typesafe-ai/sdk";
import { createDecisionEngine, type DecisionEngine } from "webml-kit/browser";

export { choice, score, noul };

export interface ITypeSafeClient {
  systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>
  ): Promise<SystemOneResult<Q>>;
  readonly isLive: boolean;
}

/**
 * Intelligent simulation engine for when TYPESAFE_API_KEY is not set.
 * Produces calibrated, deterministic System One distributions matching Jev's output schema.
 */
class SimulatedTypeSafeClient implements ITypeSafeClient {
  readonly isLive = false;

  public async systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>
  ): Promise<SystemOneResult<Q>> {
    const answers: Record<string, any> = {};
    const stateStr =
      typeof request.state === "string"
        ? request.state
        : JSON.stringify(request.state);

    for (const [id, q] of Object.entries(request.questions)) {
      if (!q) continue;

      if (q.type === "noul") {
        let prob = 0.5;
        const text = `${stateStr} ${JSON.stringify(q.instructions)}`.toLowerCase();
        const evalMove = (request.state as any)?.evaluated_move;
        const san = evalMove?.san ?? (text.includes("san") ? text : "");

        if (text.includes("king") || text.includes("attack")) {
          if (san.includes("#")) prob = 0.99;
          else if (san.includes("+") || evalMove?.is_check) prob = 0.91;
          else if (san.includes("f7") || san.includes("h7") || san.includes("g7") || san.includes("f2")) prob = 0.84;
          else if (evalMove?.is_capture || san.includes("x")) prob = 0.68;
          else if (san.includes("o-o") || san.includes("castle")) prob = 0.05;
          else prob = 0.28;
        } else if (text.includes("psychological") || text.includes("pressure") || text.includes("provocative")) {
          if (san.includes("#")) prob = 0.99;
          else if (san.includes("+") || evalMove?.is_check) prob = 0.88;
          else if (evalMove?.is_capture || san.includes("x")) prob = 0.81;
          else if (san.includes("d4") || san.includes("e4") || san.includes("c4") || san.includes("f4")) prob = 0.65;
          else if (san.includes("o-o")) prob = 0.22;
          else prob = 0.35;
        } else if (text.includes("decisive_sacrifice") || text.includes("sacrifice")) {
          prob = 0.94;
        } else if (text.includes("blunder") || text.includes("risk")) {
          prob = text.includes("??") ? 0.92 : 0.24;
        } else if (text.includes("material")) {
          prob = evalMove?.is_capture || san.includes("x") ? 0.88 : 0.22;
        }
        answers[id] = {
          type: "noul",
          noul: Math.round(prob * 100) / 100,
        };
      } else if (q.type === "choice") {
        const criteria = (q.criteria ?? {}) as Record<string, string | null>;
        const keys = Object.keys(criteria);
        let selected = "none";
        const probabilities: Record<string, number> = {};

        const userIntent =
          typeof request.state === "object" && request.state !== null && "user_intent" in request.state
            ? String((request.state as any).user_intent).toLowerCase()
            : stateStr.toLowerCase();

        const evalMove = (request.state as any)?.evaluated_move;
        const san = evalMove?.san ?? "";
        const isCapture = evalMove?.is_capture ?? san.includes("x");
        const isCheck = evalMove?.is_check ?? san.includes("+");
        const isCastling = evalMove?.is_castling ?? (san.includes("O-O") || san.includes("o-o"));

        let bestScore = 0;

        for (const k of keys) {
          if (k === "none") continue;
          let s = 0;
          const desc = (criteria[k] ?? "").toLowerCase();
          const kLower = k.toLowerCase();

          // Intent resolution matching
          if (userIntent.includes("knight") && (desc.includes("knight") || kLower.startsWith("n"))) s += 10;
          if (userIntent.includes("bishop") && (desc.includes("bishop") || kLower.startsWith("b"))) s += 10;
          if (userIntent.includes("queen's pawn") || userIntent.includes("d-pawn")) {
            if (userIntent.includes("two square") && (kLower === "d4" || desc.includes("d2 to d4"))) s += 20;
            else if (kLower === "d3" || desc.includes("d2 to d3")) s += 15;
          }
          if (userIntent.includes("king's pawn") || userIntent.includes("e-pawn")) {
            if (userIntent.includes("two square") && (kLower === "e4" || desc.includes("e2 to e4"))) s += 20;
            else if (kLower === "e3" || desc.includes("e2 to e3")) s += 15;
          }
          if (userIntent.includes("castle") && (desc.includes("castle") || kLower.includes("o-o"))) s += 25;
          if (userIntent.includes("center") && (kLower === "d4" || kLower === "e4" || kLower === "nf3" || kLower === "nc3")) s += 6;
          if (userIntent.includes("attack") && (desc.includes("captures") || kLower === "nf3")) s += 5;

          // Strategic theme matching for any move
          if (stateStr.includes("strategic_theme") || desc.includes("pawn") || desc.includes("develop")) {
            if (isCastling && kLower === "prophylaxis") s += 40;
            else if (isCheck && (kLower === "tactical_strike" || kLower === "king_hunt")) s += 38;
            else if (isCapture && (kLower === "tactical_strike" || kLower === "simplification")) s += 36;
            else if (san.startsWith("d") || san.startsWith("e") || san.startsWith("c") || san.startsWith("f")) {
              if (kLower === "pawn_break") s += 35;
            } else if (san.startsWith("N") || san.startsWith("B") || san.startsWith("R") || san.startsWith("Q")) {
              if (kLower === "piece_activation") s += 35;
            } else if (kLower === "prophylaxis") {
              s += 20;
            }
          }

          // Historical match archetype classification
          if (stateStr.includes("match_meta") || stateStr.includes("immortal") || stateStr.includes("century")) {
            if ((stateStr.includes("immortal-game") || stateStr.includes("anderssen")) && kLower === "romantic_swashbuckler") s += 60;
            else if ((stateStr.includes("opera") || stateStr.includes("morphy")) && kLower === "dynamic_initiative") s += 60;
            else if ((stateStr.includes("century") || stateStr.includes("fischer")) && kLower === "dynamic_initiative") s += 60;
            else if (stateStr.includes("kasparov") && kLower === "tactical_firestorm") s += 60;
            else if (stateStr.includes("tal") && kLower === "tactical_firestorm") s += 60;
            else if (kLower === "romantic_swashbuckler" || kLower === "tactical_firestorm") s += 20;
          }

          // Mistake archetype diagnostics
          if (stateStr.includes("??") || stateStr.includes("blunder")) {
            if (kLower === "king_safety_negligence") s += 40;
            if (kLower === "tactical_blindness") s += 25;
          }

          if (s > bestScore) {
            bestScore = s;
            selected = k;
          }
        }

        // If no match found or unrecognized command
        if (bestScore === 0) {
          selected = keys.includes("none") ? "none" : (keys[0] ?? "none");
        }

        const isNone = selected === "none";
        const baseConf = isNone ? 0.25 : 0.91;

        for (const k of keys) {
          const weight = k === selected ? baseConf : (1 - baseConf) / Math.max(1, keys.length - 1);
          probabilities[k] = Math.round(weight * 100) / 100;
        }

        answers[id] = {
          type: "choice",
          choice: selected,
          confidence: baseConf,
          probabilities,
        };
      } else if (q.type === "score") {
        const criteria = (q.criteria ?? []) as readonly unknown[];
        const numLevels = criteria.length;
        const text = `${stateStr} ${JSON.stringify(q.instructions)}`.toLowerCase();

        // Target score based on evaluated move
        let targetScore = 1.0;
        const evalMove = (request.state as any)?.evaluated_move;
        const san = (evalMove?.san ?? (text.includes("san") ? text : "")).toLowerCase();
        const isCapture = evalMove?.is_capture ?? san.includes("x");
        const isCheck = evalMove?.is_check ?? san.includes("+");
        const isCastling = evalMove?.is_castling ?? (san.includes("o-o") || san.includes("castle"));

        if (text.includes("brilliance")) {
          targetScore = 2.9; // Classic immortal matches are top-tier brilliance
        } else if (text.includes("overall sharpness") || text.includes("volatility")) {
          targetScore = 2.8;
        } else if (text.includes("aggress") || text.includes("sharp")) {
          if (san.includes("#") || san.includes("bxf7") || san.includes("rxd4") || san.includes("be6")) {
            targetScore = 2.9;
          } else if (isCheck) {
            targetScore = 2.6;
          } else if (isCapture) {
            targetScore = 2.2;
          } else if (san.startsWith("d4") || san.startsWith("e4") || san.startsWith("c4") || san.startsWith("f4")) {
            targetScore = 1.7;
          } else if (isCastling) {
            targetScore = 0.4;
          } else if (san.startsWith("n") || san.startsWith("b")) {
            targetScore = 0.9;
          } else {
            targetScore = 0.6;
          }
        } else if (text.includes("prophyl")) {
          if (isCastling) targetScore = 2.9;
          else if (san.startsWith("a3") || san.startsWith("h3") || san.startsWith("c3") || san.startsWith("d3")) targetScore = 2.3;
          else if (isCheck || isCapture) targetScore = 0.4;
          else targetScore = 1.2;
        } else if (text.includes("complex") || text.includes("tension")) {
          if (san.includes("#") || san.includes("bxf7") || san.includes("??")) targetScore = 2.9;
          else if (isCheck || isCapture) targetScore = 2.2;
          else if (isCastling) targetScore = 0.5;
          else if (san.startsWith("d") || san.startsWith("e")) targetScore = 1.5;
          else targetScore = 1.0;
        } else if (text.includes("difficult")) {
          targetScore = text.includes("??") ? 2.8 : 0.6;
        } else {
          targetScore = 1.2;
        }

        targetScore = Math.max(0, Math.min(numLevels - 1, targetScore));

        const probabilities: Record<string, number> = {};
        for (let i = 0; i < numLevels; i++) {
          const dist = Math.abs(i - targetScore);
          probabilities[i.toString()] = Math.round(Math.exp(-dist * 1.5) * 100) / 100;
        }

        answers[id] = {
          type: "score",
          score: Math.round(targetScore * 10) / 10,
          confidence: 0.91,
          legend: Object.fromEntries(criteria.map((c, i) => [i.toString(), c])),
          probabilities,
        };
      }
    }

    return {
      model: "jev-latest (offline-simulated)",
      answers: answers as any,
      usage: {
        input_tokens: 280,
        output_tokens: 45,
      },
    };
  }
}

export type EngineMode = "simulated" | "webml-kit" | "cloud-api";

/**
 * On-Device / In-Browser Decision Engine client using webml-kit (WebGPU / WASM OpenJev models).
 */
export class WebMLKitTypeSafeClient implements ITypeSafeClient {
  readonly isLive = false;
  readonly engineType = "webml-kit";
  public readonly model: string;
  private enginePromise: Promise<DecisionEngine> | null = null;
  private fallbackSimulated = new SimulatedTypeSafeClient();

  constructor(model: string = "qwen3-0.6b") {
    this.model = model;
  }

  public async getEngine(): Promise<DecisionEngine> {
    if (!this.enginePromise) {
      this.enginePromise = (async () => {
        const engine = createDecisionEngine({
          model: this.model as any,
          mode: "auto",
        });
        await engine.init();
        return engine;
      })();
    }
    return this.enginePromise;
  }

  public async systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>
  ): Promise<SystemOneResult<Q>> {
    const startTime = performance.now();
    const answers: Record<string, any> = {};

    try {
      const engine = await this.getEngine();

      for (const [id, q] of Object.entries(request.questions)) {
        if (!q) continue;

        if (q.type === "noul") {
          const res = await engine.noul({
            state: request.state,
            statement: (q as any).instructions || id,
            threshold: 0.5,
          });
          answers[id] = {
            type: "noul",
            noul: res.noul,
            latencyMs: res.latencyMs,
          };
        } else if (q.type === "choice") {
          const criteria = (q as any).criteria ?? {};
          const options =
            Object.keys(criteria).length >= 2
              ? criteria
              : { option_a: "Option A", option_b: "Option B" };
          const res = await engine.choice({
            state: request.state,
            question: (q as any).instructions || id,
            options,
          });
          answers[id] = {
            type: "choice",
            choice: res.choice,
            confidence: res.confidence,
            probabilities: res.probabilities,
            latencyMs: res.latencyMs,
          };
        } else if (q.type === "score") {
          const criteria = (q as any).criteria || [
            "Level 0",
            "Level 1",
            "Level 2",
            "Level 3",
          ];
          const res = await engine.score({
            state: request.state,
            instructions: (q as any).instructions || id,
            criteria,
          });
          answers[id] = {
            type: "score",
            score: res.score,
            confidence: res.confidence,
            probabilities: res.probabilities,
            latencyMs: res.latencyMs,
          };
        }
      }

      return {
        model: `webml-kit (${this.model})`,
        answers: answers as any,
        usage: { input_tokens: 30, output_tokens: 15 },
        latencyMs: Math.max(1, Math.round(performance.now() - startTime)),
      } as SystemOneResult<Q>;
    } catch (err) {
      console.warn("webml-kit evaluation failed, using simulated fallback:", err);
      return this.fallbackSimulated.systemOne(request);
    }
  }
}

class LiveTypeSafeClientWrapper implements ITypeSafeClient {
  readonly isLive = true;
  private client: TypeSafeClient;

  constructor(apiKey?: string) {
    this.client = new TypeSafeClient({ apiKey });
  }

  public async systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>
  ): Promise<SystemOneResult<Q>> {
    return this.client.systemOne(request);
  }
}

let clientInstance: ITypeSafeClient | null = null;

function getStoredApiKey(): string | null {
  if (typeof process !== "undefined" && process?.env?.["TYPESAFE_API_KEY"]) {
    return process.env["TYPESAFE_API_KEY"];
  }
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return window.localStorage.getItem("TYPESAFE_API_KEY");
  }
  return null;
}

function setStoredApiKey(key: string | null) {
  if (typeof process !== "undefined" && process?.env) {
    if (key) {
      process.env["TYPESAFE_API_KEY"] = key;
    } else {
      delete process.env["TYPESAFE_API_KEY"];
    }
  }
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    if (key) {
      window.localStorage.setItem("TYPESAFE_API_KEY", key);
    } else {
      window.localStorage.removeItem("TYPESAFE_API_KEY");
    }
  }
}

export function setApiKey(key: string | null | undefined): boolean {
  if (key && key.trim().length > 0) {
    const cleanKey = key.trim();
    setStoredApiKey(cleanKey);
    clientInstance = new LiveTypeSafeClientWrapper(cleanKey);
    return true;
  } else {
    setStoredApiKey(null);
    clientInstance = new SimulatedTypeSafeClient();
    return false;
  }
}

export function setEngineMode(
  mode: EngineMode,
  options?: { model?: string; apiKey?: string }
): ITypeSafeClient {
  if (mode === "webml-kit") {
    clientInstance = new WebMLKitTypeSafeClient(options?.model || "qwen3-0.6b");
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("CHESS_ENGINE_MODE", "webml-kit");
      if (options?.model) {
        window.localStorage.setItem("CHESS_WEBML_MODEL", options.model);
      }
    }
  } else if (mode === "cloud-api") {
    const key = options?.apiKey || getStoredApiKey();
    if (key) {
      setStoredApiKey(key);
      clientInstance = new LiveTypeSafeClientWrapper(key);
    } else {
      clientInstance = new SimulatedTypeSafeClient();
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("CHESS_ENGINE_MODE", "cloud-api");
    }
  } else {
    clientInstance = new SimulatedTypeSafeClient();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("CHESS_ENGINE_MODE", "simulated");
    }
  }
  return clientInstance;
}

export function getEngineMode(): {
  mode: EngineMode;
  model?: string;
  isLive: boolean;
} {
  const current = getTypeSafeClient();
  let storedMode: EngineMode = "simulated";
  let storedModel: string | undefined = undefined;

  if (typeof window !== "undefined" && window.localStorage) {
    const s = window.localStorage.getItem("CHESS_ENGINE_MODE") as EngineMode | null;
    if (s && ["simulated", "webml-kit", "cloud-api"].includes(s)) {
      storedMode = s;
    }
    storedModel = window.localStorage.getItem("CHESS_WEBML_MODEL") || undefined;
  }

  if (current instanceof WebMLKitTypeSafeClient) {
    return { mode: "webml-kit", model: current.model, isLive: false };
  }
  if (current.isLive) {
    return { mode: "cloud-api", isLive: true };
  }
  return { mode: storedMode, model: storedModel, isLive: false };
}

export function getApiKeyStatus(): { isLive: boolean; maskedKey?: string } {
  const current = getTypeSafeClient();
  const key = getStoredApiKey();
  if (current.isLive && key) {
    const visible = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "ts_••••••••";
    return { isLive: true, maskedKey: visible };
  }
  return { isLive: false };
}

export function getTypeSafeClient(): ITypeSafeClient {
  if (clientInstance) return clientInstance;

  let storedMode: EngineMode = "simulated";
  let storedModel = "qwen3-0.6b";
  if (typeof window !== "undefined" && window.localStorage) {
    const s = window.localStorage.getItem("CHESS_ENGINE_MODE") as EngineMode | null;
    if (s && ["simulated", "webml-kit", "cloud-api"].includes(s)) {
      storedMode = s;
    }
    const m = window.localStorage.getItem("CHESS_WEBML_MODEL");
    if (m) storedModel = m;
  }

  if (storedMode === "webml-kit") {
    clientInstance = new WebMLKitTypeSafeClient(storedModel);
    return clientInstance;
  }

  const key = getStoredApiKey();
  if (storedMode === "cloud-api" && key && key.trim().length > 0) {
    clientInstance = new LiveTypeSafeClientWrapper(key);
  } else {
    clientInstance = new SimulatedTypeSafeClient();
  }
  return clientInstance;
}
