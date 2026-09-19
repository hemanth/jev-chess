import {
  TypeSafeClient,
  choice,
  score,
  noul,
  type Questions,
  type SystemOneRequest,
  type SystemOneResult,
} from "@typesafe-ai/sdk";

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

export function setApiKey(key: string | null | undefined): boolean {
  if (key && key.trim().length > 0) {
    const cleanKey = key.trim();
    process.env["TYPESAFE_API_KEY"] = cleanKey;
    clientInstance = new LiveTypeSafeClientWrapper(cleanKey);
    return true;
  } else {
    delete process.env["TYPESAFE_API_KEY"];
    clientInstance = new SimulatedTypeSafeClient();
    return false;
  }
}

export function getApiKeyStatus(): { isLive: boolean; maskedKey?: string } {
  const current = getTypeSafeClient();
  const key = process.env["TYPESAFE_API_KEY"];
  if (current.isLive && key) {
    const visible = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "ts_••••••••";
    return { isLive: true, maskedKey: visible };
  }
  return { isLive: false };
}

export function getTypeSafeClient(): ITypeSafeClient {
  if (clientInstance) return clientInstance;

  const key = process.env["TYPESAFE_API_KEY"];
  if (key && key.trim().length > 0) {
    clientInstance = new LiveTypeSafeClientWrapper(key);
  } else {
    clientInstance = new SimulatedTypeSafeClient();
  }
  return clientInstance;
}
