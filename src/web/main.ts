import { ChessEngine } from "../chessEngine.js";
import { MoveResolver } from "../moveResolver.js";
import { MoveEvaluator } from "../moveEvaluator.js";
import { PersonaEngine } from "../personaEngine.js";
import { ClassicMatchStudio, CLASSIC_MATCHES, type ClassicMatch } from "../classicMatches.js";
import { setApiKey, getApiKeyStatus } from "../typeSafeClient.js";
import type { AnnotatedMove, MoveEvaluation, PersonaId } from "../types.js";

const PIECE_UNICODE: Record<string, string> = {
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
  P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔",
};

const engine = new ChessEngine();
const resolver = new MoveResolver();
const evaluator = new MoveEvaluator();
const personaEngine = new PersonaEngine();
const matchStudio = new ClassicMatchStudio();

let selectedSquare: string | null = null;
let legalMoves: AnnotatedMove[] = [];
let currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let activePersona: PersonaId = "tal";
let lastFrom: string | null = null;
let lastTo: string | null = null;

let activeMatch: ClassicMatch | null = null;
let matchMoveIndex = 0;
let autoPlayTimer: any = null;

function renderBoard(fen: string) {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;
  boardEl.innerHTML = "";
  const [placement, turn] = fen.split(" ");

  const turnDot = document.getElementById("turnDot");
  const turnLabel = document.getElementById("turnLabel");
  if (turnDot && turnLabel) {
    if (turn === "w") {
      turnDot.className = "turn-dot white";
      turnLabel.innerText = "White to move";
    } else {
      turnDot.className = "turn-dot black";
      turnLabel.innerText = "Black to move";
    }
  }

  const rows = (placement ?? "").split("/");
  for (let r = 0; r < 8; r++) {
    let col = 0;
    const rowStr = rows[r] ?? "";
    for (const ch of rowStr) {
      if (!isNaN(Number(ch))) {
        for (let empty = 0; empty < parseInt(ch, 10); empty++) {
          createSquare(r, col, null);
          col++;
        }
      } else {
        createSquare(r, col, ch);
        col++;
      }
    }
  }
}

function createSquare(r: number, c: number, piece: string | null) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const sqName = files[c] + ranks[r];
  const isLight = (r + c) % 2 === 0;

  const div = document.createElement("div");
  div.className = "square " + (isLight ? "light" : "dark");
  div.dataset.sq = sqName;

  if (sqName === selectedSquare) div.classList.add("selected");
  if (sqName === lastFrom) div.classList.add("last-from");
  if (sqName === lastTo) div.classList.add("last-to");

  if (selectedSquare) {
    const canMove = legalMoves.some((m) => m.from === selectedSquare && m.to === sqName);
    if (canMove) div.classList.add("target");
  }

  if (c === 0) {
    const rankLabel = document.createElement("span");
    rankLabel.className = "coord-label coord-rank";
    rankLabel.innerText = ranks[r] ?? "";
    div.appendChild(rankLabel);
  }
  if (r === 7) {
    const fileLabel = document.createElement("span");
    fileLabel.className = "coord-label coord-file";
    fileLabel.innerText = files[c] ?? "";
    div.appendChild(fileLabel);
  }

  if (piece) {
    const span = document.createElement("span");
    span.innerText = PIECE_UNICODE[piece] || piece;
    div.appendChild(span);
  }

  div.onclick = () => onSquareClick(sqName);
  document.getElementById("board")?.appendChild(div);
}

function updateLegalMoves() {
  legalMoves = engine.getAnnotatedMoves();
  const mat = engine.getMaterialBalance();
  const matEl = document.getElementById("materialBalance");
  if (matEl) matEl.innerText = mat.description || "Equal";
  updateHistory(engine.history());
}

function updateHistory(history: string[]) {
  const el = document.getElementById("historyList");
  if (!el) return;
  if (!history || history.length === 0) {
    el.innerHTML = '<span style="color: #666;">No moves played yet</span>';
    return;
  }
  el.innerHTML = history
    .map((m, i) => `<span class="history-item">${i % 2 === 0 ? Math.floor(i / 2 + 1) + ". " : ""}${m}</span>`)
    .join(" ");
  el.scrollTop = el.scrollHeight;
}

async function onSquareClick(sq: string) {
  if (selectedSquare) {
    const move = legalMoves.find((m) => m.from === selectedSquare && m.to === sq);
    if (move) {
      await playMove(move.san);
      selectedSquare = null;
      return;
    }
  }
  const hasMoves = legalMoves.some((m) => m.from === sq);
  selectedSquare = hasMoves ? sq : null;
  renderBoard(currentFen);
}

async function playMove(san: string) {
  const move = engine.makeMove(san);
  if (move) {
    lastFrom = move.from;
    lastTo = move.to;
    currentFen = engine.fen();
    renderBoard(currentFen);
    updateLegalMoves();

    const evaluation = await evaluator.evaluateMove(engine, move);
    updateIntelligence(evaluation);
  }
}

function formatTheme(theme: string | null | undefined): string {
  if (!theme) return "--";
  return theme
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function updateIntelligence(ev: MoveEvaluation | null) {
  if (!ev) return;
  const badge = document.getElementById("lastMoveBadge");
  if (badge) badge.innerText = ev.commentaryBadge || "Move Evaluated";

  const mSharp = document.getElementById("mSharp");
  if (mSharp) mSharp.innerText = ev.tacticalSharpness.score.toFixed(1);

  const mSharpBar = document.getElementById("mSharpBar");
  if (mSharpBar) {
    mSharpBar.style.width = Math.min(100, (ev.tacticalSharpness.score / 3.0) * 100) + "%";
  }

  const mTheme = document.getElementById("mTheme");
  if (mTheme) mTheme.innerText = formatTheme(ev.strategicTheme.theme);

  const mThemeConf = document.getElementById("mThemeConf");
  if (mThemeConf) {
    mThemeConf.innerText = "Confidence: " + (ev.strategicTheme.confidence * 100).toFixed(0) + "%";
  }

  const mKing = document.getElementById("mKing");
  if (mKing) mKing.innerText = (ev.kingAttackRisk.probability * 100).toFixed(0) + "%";

  const mKingBar = document.getElementById("mKingBar");
  if (mKingBar) mKingBar.style.width = ev.kingAttackRisk.probability * 100 + "%";

  const mPressure = document.getElementById("mPressure");
  if (mPressure) mPressure.innerText = (ev.psychologicalPressure.probability * 100).toFixed(0) + "%";

  const mPressureBar = document.getElementById("mPressureBar");
  if (mPressureBar) mPressureBar.style.width = ev.psychologicalPressure.probability * 100 + "%";
}

function resetIntelligence() {
  const badge = document.getElementById("lastMoveBadge");
  if (badge) badge.innerText = "Waiting for move...";
  const mSharp = document.getElementById("mSharp");
  if (mSharp) mSharp.innerText = "--";
  const mSharpBar = document.getElementById("mSharpBar");
  if (mSharpBar) mSharpBar.style.width = "0%";
  const mTheme = document.getElementById("mTheme");
  if (mTheme) mTheme.innerText = "--";
  const mThemeConf = document.getElementById("mThemeConf");
  if (mThemeConf) mThemeConf.innerText = "Confidence: --";
  const mKing = document.getElementById("mKing");
  if (mKing) mKing.innerText = "--";
  const mKingBar = document.getElementById("mKingBar");
  if (mKingBar) mKingBar.style.width = "0%";
  const mPressure = document.getElementById("mPressure");
  if (mPressure) mPressure.innerText = "--";
  const mPressureBar = document.getElementById("mPressureBar");
  if (mPressureBar) mPressureBar.style.width = "0%";
}

async function resolveAndPlayMove() {
  const input = document.getElementById("nlInput") as HTMLInputElement | null;
  if (!input) return;
  const q = input.value.trim();
  if (!q) return;

  const banner = document.getElementById("resolutionResult");
  const resText = document.getElementById("resText");
  const resConf = document.getElementById("resConf");
  if (banner) banner.style.display = "flex";
  if (resText) resText.innerText = "Resolving intent via TypeSafe Choice...";
  if (resConf) resConf.innerText = "";

  const data = await resolver.resolveIntent(engine, q);

  if (data.matchedMove) {
    if (resText) resText.innerText = "Matched: " + data.matchedMove.san + " (" + data.matchedMove.description + ")";
    if (resConf) resConf.innerText = (data.confidence * 100).toFixed(1) + "% confidence";
    input.value = "";
    await playMove(data.matchedMove.san);
  } else {
    if (resText) resText.innerText = "Ambiguous: " + (data.alternativeCandidates?.join(", ") || "No legal match");
    if (resConf) resConf.innerText = "Low confidence (" + (data.confidence * 100).toFixed(1) + "%)";
  }
}

function setChip(txt: string) {
  const input = document.getElementById("nlInput") as HTMLInputElement | null;
  if (input) {
    input.value = txt;
    resolveAndPlayMove();
  }
}

function selectPersona(id: PersonaId, el: HTMLElement) {
  activePersona = id;
  document.querySelectorAll(".persona-card").forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
}

async function makePersonaMove() {
  const rationaleEl = document.getElementById("personaRationale");
  if (rationaleEl) rationaleEl.innerText = "Evaluating candidates with TypeSafe Composite Scoring...";

  try {
    const decision = await personaEngine.selectMove(engine, activePersona);
    if (rationaleEl) rationaleEl.innerText = decision.rationale;
    await playMove(decision.selectedMove.san);
  } catch (err: any) {
    if (rationaleEl) rationaleEl.innerText = err?.message || "Unable to make persona move.";
  }
}

function resetGame() {
  stopAutoPlay();
  engine.reset();
  currentFen = engine.fen();
  lastFrom = null;
  lastTo = null;
  selectedSquare = null;
  const resResult = document.getElementById("resolutionResult");
  if (resResult) resResult.style.display = "none";
  renderBoard(currentFen);
  updateLegalMoves();
  resetIntelligence();
}

function undoMove() {
  stopAutoPlay();
  engine.chess.undo();
  currentFen = engine.fen();
  renderBoard(currentFen);
  updateLegalMoves();
}

/* Classic Matches Functions */
function initClassicMatches() {
  const select = document.getElementById("matchSelect") as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = CLASSIC_MATCHES.map(
    (m) => `<option value="${m.id}">${m.title} (${m.year}) — ${m.white} vs ${m.black}</option>`
  ).join("");

  if (CLASSIC_MATCHES.length > 0) {
    selectMatch(CLASSIC_MATCHES[0]!.id);
  }
}

function onMatchSelectChange(matchId: string) {
  if (matchId) selectMatch(matchId);
}

function selectMatch(matchId: string) {
  stopAutoPlay();
  activeMatch = CLASSIC_MATCHES.find((m) => m.id === matchId) || null;
  if (!activeMatch) return;

  const metaBox = document.getElementById("matchMetaBox");
  if (metaBox) metaBox.style.display = "block";

  const pEl = document.getElementById("matchPlayers");
  if (pEl) pEl.innerText = `${activeMatch.white} vs ${activeMatch.black}`;

  const yEl = document.getElementById("matchYearEvent");
  if (yEl) yEl.innerText = `${activeMatch.year} · ${activeMatch.event}`;

  const dEl = document.getElementById("matchDesc");
  if (dEl) dEl.innerText = activeMatch.description;

  const ecoEl = document.getElementById("matchEco");
  if (ecoEl) ecoEl.innerText = activeMatch.eco;

  const openEl = document.getElementById("matchOpening");
  if (openEl) openEl.innerText = activeMatch.opening;

  const resEl = document.getElementById("matchResult");
  if (resEl) resEl.innerText = activeMatch.result;

  goToReplayMove(0);
  const card = document.getElementById("classificationCard");
  if (card) card.style.display = "none";
}

async function goToReplayMove(index: number) {
  if (!activeMatch) return;
  const target = Math.max(0, Math.min(activeMatch.moves.length, index));
  matchMoveIndex = target;

  const moveLabel = document.getElementById("replayMoveLabel");
  if (moveLabel) moveLabel.innerText = `Move ${matchMoveIndex} / ${activeMatch.moves.length}`;

  const pct = (matchMoveIndex / Math.max(1, activeMatch.moves.length)) * 100;
  const bar = document.getElementById("replayProgressBar");
  if (bar) bar.style.width = pct + "%";

  const turnLabel = document.getElementById("replayTurnLabel");
  if (turnLabel) {
    if (matchMoveIndex === 0) {
      turnLabel.innerText = "Starting Position";
    } else {
      const lastSan = activeMatch.moves[matchMoveIndex - 1];
      const moveNum = Math.floor((matchMoveIndex - 1) / 2) + 1;
      const color = (matchMoveIndex - 1) % 2 === 0 ? "White" : "Black";
      turnLabel.innerText = `${moveNum}${color === "White" ? "." : "..."} ${lastSan}`;
    }
  }

  engine.reset();
  let lastEvaluatedMove: AnnotatedMove | null = null;
  for (let i = 0; i < target; i++) {
    const mv = engine.makeMove(activeMatch.moves[i]!);
    if (i === target - 1) {
      lastEvaluatedMove = mv;
    }
  }

  currentFen = engine.fen();
  if (lastEvaluatedMove) {
    lastFrom = lastEvaluatedMove.from;
    lastTo = lastEvaluatedMove.to;
  } else {
    lastFrom = null;
    lastTo = null;
  }

  updateLegalMoves();
  renderBoard(currentFen);

  if (lastEvaluatedMove) {
    const evaluation = await evaluator.evaluateMove(engine, lastEvaluatedMove);
    updateIntelligence(evaluation);
  } else {
    resetIntelligence();
  }
}

function stepFirst() {
  stopAutoPlay();
  goToReplayMove(0);
}

function stepPrev() {
  stopAutoPlay();
  if (matchMoveIndex > 0) goToReplayMove(matchMoveIndex - 1);
}

function stepNext() {
  if (activeMatch && matchMoveIndex < activeMatch.moves.length) {
    goToReplayMove(matchMoveIndex + 1);
  }
}

function stepLast() {
  stopAutoPlay();
  if (activeMatch) goToReplayMove(activeMatch.moves.length);
}

function jumpToTurningPoint() {
  stopAutoPlay();
  if (activeMatch) goToReplayMove(activeMatch.keyMoveIndex);
}

function toggleAutoPlay() {
  if (autoPlayTimer) {
    stopAutoPlay();
  } else {
    if (!activeMatch) return;
    if (matchMoveIndex >= activeMatch.moves.length) {
      goToReplayMove(0);
    }
    const btn = document.getElementById("autoPlayBtn");
    if (btn) btn.innerText = "Pause";
    autoPlayTimer = setInterval(() => {
      if (activeMatch && matchMoveIndex < activeMatch.moves.length) {
        stepNext();
      } else {
        stopAutoPlay();
      }
    }, 1200);
  }
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
    const btn = document.getElementById("autoPlayBtn");
    if (btn) btn.innerText = "Auto Play";
  }
}

async function classifyCurrentMatch() {
  if (!activeMatch) return;
  const btn = document.getElementById("classifyBtn") as HTMLButtonElement | null;
  if (btn) {
    btn.innerText = "Classifying with System One...";
    btn.disabled = true;
  }

  try {
    const cl = await matchStudio.classifyMatch(activeMatch);

    const card = document.getElementById("classificationCard");
    if (card) card.style.display = "flex";

    const aEl = document.getElementById("classArchetype");
    if (aEl) aEl.innerText = cl.archetype;

    const sEl = document.getElementById("classSacrifice");
    if (sEl) sEl.innerText = cl.hasDecisiveSacrifice ? "Decisive Sacrifice Confirmed" : "No Decisive Sacrifice";

    const bScore = document.getElementById("classBrillianceScore");
    if (bScore) bScore.innerText = cl.aestheticBrilliance.score.toFixed(1) + " / 3.0";

    const bLevel = document.getElementById("classBrillianceLevel");
    if (bLevel) bLevel.innerText = cl.aestheticBrilliance.level;

    const shScore = document.getElementById("classSharpnessScore");
    if (shScore) shScore.innerText = cl.overallSharpness.score.toFixed(1) + " / 3.0";

    const shLevel = document.getElementById("classSharpnessLevel");
    if (shLevel) shLevel.innerText = cl.overallSharpness.level;

    const tMove = document.getElementById("classTurningMove");
    if (tMove) tMove.innerText = cl.turningPoint.san;

    const tNum = document.getElementById("classTurningNum");
    if (tNum) tNum.innerText = `Move ${cl.turningPoint.moveNumber}`;

    const bdT = document.getElementById("bdTactical");
    if (bdT) bdT.innerText = cl.strategicBreakdown.tacticalStrikesPct + "%";

    const bdPw = document.getElementById("bdPawn");
    if (bdPw) bdPw.innerText = cl.strategicBreakdown.pawnBreaksPct + "%";

    const bdPc = document.getElementById("bdPiece");
    if (bdPc) bdPc.innerText = cl.strategicBreakdown.pieceActivationPct + "%";

    const bdPr = document.getElementById("bdProphyl");
    if (bdPr) bdPr.innerText = cl.strategicBreakdown.prophylaxisPct + "%";

    const verd = document.getElementById("classVerdict");
    if (verd) verd.innerText = cl.verdict;
  } catch (e) {
    console.error("Failed to classify match", e);
  } finally {
    if (btn) {
      btn.innerText = "Classify Match with System One";
      btn.disabled = false;
    }
  }
}

/* API Key Configuration */
function checkKeyStatus() {
  const status = getApiKeyStatus();
  const badge = document.getElementById("backendBadge");
  const dot = document.getElementById("backendStatusDot");
  const text = document.getElementById("backendStatusText");
  const btnLabel = document.getElementById("keyBtnLabel");

  if (status.isLive) {
    if (badge) badge.className = "badge-status";
    if (dot) dot.className = "status-dot live";
    if (text) text.innerText = "Live API (jev-latest)";
    if (btnLabel) btnLabel.innerText = status.maskedKey || "Live Key";
  } else {
    if (badge) badge.className = "badge-status badge-sim";
    if (dot) dot.className = "status-dot sim";
    if (text) text.innerText = "Simulation Mode (jev-latest calibrated)";
    if (btnLabel) btnLabel.innerText = "API Key";
  }
}

function openKeyModal() {
  const modal = document.getElementById("keyModal");
  if (modal) modal.style.display = "flex";
  const st = document.getElementById("modalStatus");
  if (st) st.innerText = "";
}

function closeKeyModal() {
  const modal = document.getElementById("keyModal");
  if (modal) modal.style.display = "none";
}

function toggleKeyVisibility() {
  const input = document.getElementById("keyInput") as HTMLInputElement | null;
  const btn = document.getElementById("toggleVisibilityBtn");
  if (!input || !btn) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  btn.innerText = isPass ? "Hide" : "Show";
}

function saveApiKey() {
  const input = document.getElementById("keyInput") as HTMLInputElement | null;
  if (!input) return;
  const key = input.value.trim();
  const statusEl = document.getElementById("modalStatus");
  if (!key) {
    if (statusEl) statusEl.innerHTML = '<span style="color: var(--danger)">Please enter a valid API key.</span>';
    return;
  }
  setApiKey(key);
  if (statusEl) {
    statusEl.innerHTML = '<span style="color: var(--success)">Successfully connected to live jev-latest model.</span>';
  }
  input.value = "";
  checkKeyStatus();
  setTimeout(closeKeyModal, 1000);
}

function clearApiKey() {
  setApiKey(null);
  const statusEl = document.getElementById("modalStatus");
  if (statusEl) {
    statusEl.innerHTML = '<span style="color: var(--warning)">Switched back to calibrated simulation mode.</span>';
  }
  checkKeyStatus();
  setTimeout(closeKeyModal, 800);
}

// Bind to window for HTML click handlers
const w = window as any;
w.renderBoard = renderBoard;
w.playMove = playMove;
w.resolveAndPlayMove = resolveAndPlayMove;
w.setChip = setChip;
w.selectPersona = selectPersona;
w.makePersonaMove = makePersonaMove;
w.resetGame = resetGame;
w.undoMove = undoMove;
w.onMatchSelectChange = onMatchSelectChange;
w.goToReplayMove = goToReplayMove;
w.stepFirst = stepFirst;
w.stepPrev = stepPrev;
w.stepNext = stepNext;
w.stepLast = stepLast;
w.jumpToTurningPoint = jumpToTurningPoint;
w.toggleAutoPlay = toggleAutoPlay;
w.classifyCurrentMatch = classifyCurrentMatch;
w.openKeyModal = openKeyModal;
w.closeKeyModal = closeKeyModal;
w.toggleKeyVisibility = toggleKeyVisibility;
w.saveApiKey = saveApiKey;
w.clearApiKey = clearApiKey;

// DOM Ready
window.addEventListener("DOMContentLoaded", () => {
  renderBoard(currentFen);
  updateLegalMoves();
  checkKeyStatus();
  initClassicMatches();
});
