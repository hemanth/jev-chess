import http from "node:http";
import { ChessEngine } from "./chessEngine.js";
import { MoveResolver } from "./moveResolver.js";
import { MoveEvaluator } from "./moveEvaluator.js";
import { PersonaEngine } from "./personaEngine.js";
import { GameReviewer } from "./gameReviewer.js";
import { setApiKey, getApiKeyStatus } from "./typeSafeClient.js";
import { ClassicMatchStudio, CLASSIC_MATCHES } from "./classicMatches.js";

const PORT = 3333;
const resolver = new MoveResolver();
const evaluator = new MoveEvaluator();
const personaEngine = new PersonaEngine();
const reviewer = new GameReviewer();
const matchStudio = new ClassicMatchStudio();

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jev Chess — TypeSafe AI System One Studio</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --card-border: #30363d;
      --text: #c9d1d9;
      --text-bright: #f0f6fc;
      --accent: #58a6ff;
      --accent-hover: #79c0ff;
      --success: #3fb950;
      --warning: #d29922;
      --danger: #f85149;
      --board-light: #f0d9b5;
      --board-dark: #b58863;
      --sq-highlight: rgba(255, 255, 0, 0.45);
      --sq-selected: rgba(88, 166, 255, 0.6);
      --sq-target: rgba(63, 185, 80, 0.5);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--card-border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand h1 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-bright);
      letter-spacing: -0.02em;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .status-dot.live {
      background: var(--success);
      box-shadow: 0 0 8px rgba(63, 185, 80, 0.7);
    }
    .status-dot.sim {
      background: var(--warning);
      box-shadow: 0 0 6px rgba(210, 153, 34, 0.5);
    }
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(63, 185, 80, 0.12);
      color: var(--success);
      border: 1px solid rgba(63, 185, 80, 0.3);
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    .badge-sim {
      background: rgba(210, 153, 34, 0.12);
      color: var(--warning);
      border-color: rgba(210, 153, 34, 0.3);
    }
    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      grid-template-columns: 500px 1fr;
      gap: 28px;
    }
    @media (max-width: 1080px) {
      main { grid-template-columns: 1fr; }
    }
    /* Chessboard Container */
    .board-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      height: fit-content;
    }
    .board-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }
    .turn-indicator {
      font-weight: 600;
      color: var(--text-bright);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .turn-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid #666;
    }
    .turn-dot.white { background: #fff; }
    .turn-dot.black { background: #111; }
    #board {
      width: 460px;
      height: 460px;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      grid-template-rows: repeat(8, 1fr);
      border: 2px solid #444;
      border-radius: 4px;
      overflow: hidden;
      user-select: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .square {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .square.light { background: var(--board-light); color: #222; }
    .square.dark { background: var(--board-dark); color: #111; }
    .square.selected { background: var(--sq-selected) !important; }
    .square.target::after {
      content: "";
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--sq-target);
      pointer-events: none;
    }
    .square.last-from, .square.last-to { background: var(--sq-highlight) !important; }
    .coord-label {
      position: absolute;
      font-size: 10px;
      font-weight: 700;
      pointer-events: none;
      opacity: 0.6;
    }
    .coord-rank { top: 2px; left: 3px; }
    .coord-file { bottom: 2px; right: 3px; }
    .board-actions {
      display: flex;
      gap: 8px;
      width: 100%;
    }
    .btn {
      flex: 1;
      background: #21262d;
      border: 1px solid var(--card-border);
      color: var(--text-bright);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn:hover { background: #30363d; border-color: #8b949e; }
    .btn-primary {
      background: #238636;
      border-color: rgba(240, 246, 252, 0.1);
    }
    .btn-primary:hover { background: #2ea043; }
    .btn-accent {
      background: #1f6feb;
      border-color: rgba(240, 246, 252, 0.1);
    }
    .btn-accent:hover { background: #388bfd; }

    /* Studio Panels */
    .studio {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px 20px;
    }
    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-bright);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .panel-subtitle {
      font-size: 0.8rem;
      color: #8b949e;
      font-weight: normal;
    }
    /* Natural Language Input */
    .nl-input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .nl-input {
      flex: 1;
      background: #0d1117;
      border: 1px solid var(--card-border);
      color: var(--text-bright);
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.9rem;
      outline: none;
    }
    .nl-input:focus { border-color: var(--accent); }
    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .chip {
      background: #21262d;
      border: 1px solid var(--card-border);
      color: #8b949e;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .chip:hover { color: var(--text-bright); border-color: var(--accent); }
    .resolution-banner {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    /* Intelligence Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .metric-card {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .metric-name {
      font-size: 0.75rem;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .metric-value {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-bright);
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .metric-sub {
      font-size: 0.75rem;
      color: #8b949e;
      font-weight: normal;
    }
    .progress-bar {
      height: 6px;
      background: #21262d;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      width: 0%;
      transition: width 0.3s;
    }
    /* Persona Selector */
    .persona-select-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .persona-card {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .persona-card:hover { border-color: #8b949e; }
    .persona-card.active {
      border-color: var(--accent);
      background: rgba(88, 166, 255, 0.08);
    }
    .persona-name { font-size: 0.85rem; font-weight: 700; color: var(--text-bright); }
    .persona-title { font-size: 0.7rem; color: #8b949e; margin-top: 2px; }
    .persona-breakdown {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 0.8rem;
      color: var(--text);
      line-height: 1.5;
    }
    .history-list {
      max-height: 110px;
      overflow-y: auto;
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
      color: #8b949e;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 6px;
    }
    .history-item { color: var(--text-bright); }

    /* Classic Matches Styles */
    .match-select {
      width: 100%;
      background: #0d1117;
      border: 1px solid var(--card-border);
      color: var(--text-bright);
      padding: 9px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }
    .match-select:focus { border-color: var(--accent); }
    .match-meta-box {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px 14px;
      margin-top: 10px;
      font-size: 0.82rem;
      line-height: 1.5;
    }
    .match-meta-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .match-players {
      font-weight: 700;
      color: var(--text-bright);
      font-size: 0.9rem;
    }
    .match-tags {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      flex-wrap: wrap;
    }
    .match-tag {
      font-size: 0.7rem;
      padding: 2px 7px;
      border-radius: 4px;
      background: #21262d;
      color: #8b949e;
    }
    .match-tag.result {
      color: var(--accent);
      background: rgba(88, 166, 255, 0.1);
    }
    .replay-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }
    .replay-btn {
      background: #21262d;
      border: 1px solid var(--card-border);
      color: var(--text-bright);
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .replay-btn:hover { background: #30363d; border-color: #8b949e; }
    .replay-progress-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .replay-progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #8b949e;
      font-family: ui-monospace, monospace;
    }
    .classification-panel {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 14px;
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .archetype-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(88, 166, 255, 0.12);
      border: 1px solid rgba(88, 166, 255, 0.3);
      color: var(--accent);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      align-self: flex-start;
    }
    .class-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .class-stat {
      background: #161b22;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .class-stat-name { font-size: 0.7rem; color: #8b949e; text-transform: uppercase; font-weight: 600; }
    .class-stat-val { font-size: 0.95rem; font-weight: 700; color: var(--text-bright); }
    .class-stat-desc { font-size: 0.72rem; color: #8b949e; }
    .breakdown-row {
      display: flex;
      gap: 6px;
      font-size: 0.75rem;
      flex-wrap: wrap;
    }
    .breakdown-pill {
      background: #161b22;
      border: 1px solid var(--card-border);
      border-radius: 4px;
      padding: 4px 8px;
      color: var(--text);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div>
        <h1>Jev Chess Studio</h1>
        <div style="font-size: 0.75rem; color: #8b949e;">TypeSafe AI System One Architecture</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <button class="btn" onclick="openKeyModal()" style="padding: 5px 12px; font-size: 0.8rem; background: #21262d; border: 1px solid var(--card-border);">
        <span id="keyBtnLabel">API Key</span>
      </button>
      <div id="backendBadge" class="badge-status badge-sim" onclick="openKeyModal()" title="Click to manage TypeSafe API Key">
        <span id="backendStatusDot" class="status-dot sim"></span>
        <span id="backendStatusText">Simulation Mode (jev-latest calibrated)</span>
      </div>
    </div>
  </header>

  <!-- TypeSafe API Key Modal -->
  <div id="keyModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(5px); z-index: 999; align-items: center; justify-content: center;">
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; width: 480px; max-width: 92vw; padding: 24px; box-shadow: 0 20px 48px rgba(0,0,0,0.7);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="color: #f0f6fc; font-size: 1.15rem; font-weight: 700;">
          TypeSafe API Configuration
        </h3>
        <button onclick="closeKeyModal()" style="background: none; border: none; color: #8b949e; font-size: 1.2rem; cursor: pointer; padding: 4px;">✕</button>
      </div>

      <p style="font-size: 0.85rem; color: #8b949e; margin-bottom: 16px; line-height: 1.45;">
        Connect directly to TypeSafe's flagship System One model (<strong style="color: #f0f6fc;">jev-latest</strong>). When active, all natural language move parsing, evaluations, and AI personas run directly against TypeSafe's live inference endpoints.
      </p>

      <div style="margin-bottom: 14px;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #c9d1d9; margin-bottom: 6px;">
          TypeSafe API Key
        </label>
        <div style="display: flex; gap: 6px;">
          <input id="keyInput" type="password" placeholder="ts_..." style="flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 10px; color: #f0f6fc; font-family: ui-monospace, monospace; font-size: 0.9rem; outline: none;" onkeydown="if(event.key==='Enter') saveApiKey()" />
          <button class="btn" onclick="toggleKeyVisibility()" style="flex: 0 0 60px; padding: 0;" title="Toggle Visibility">Show</button>
        </div>
      </div>

      <div id="modalStatus" style="font-size: 0.82rem; margin-bottom: 16px; min-height: 20px;"></div>

      <div style="display: flex; gap: 8px; flex-direction: column;">
        <button class="btn btn-accent" onclick="saveApiKey()" style="padding: 10px; font-weight: 700;">
          Connect to Live API (jev-latest)
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="btn" onclick="clearApiKey()" style="flex: 1;">
            Revert to Simulation Mode
          </button>
          <button class="btn" onclick="closeKeyModal()" style="flex: 1;">
            Cancel
          </button>
        </div>
      </div>

      <div style="margin-top: 16px; text-align: center; font-size: 0.75rem; color: #8b949e;">
        Obtain an API key at <a href="https://console.typesafe.ai/" target="_blank" style="color: #58a6ff; text-decoration: underline;">console.typesafe.ai</a>
      </div>
    </div>
  </div>

  <main>
    <!-- Left: Chessboard -->
    <div class="board-card">
      <div class="board-header">
        <div class="turn-indicator">
          <div id="turnDot" class="turn-dot white"></div>
          <span id="turnLabel">White to move</span>
        </div>
        <div id="materialBalance" style="color: #8b949e; font-size: 0.8rem;">Material: Equal</div>
      </div>

      <div id="board"></div>

      <div class="board-actions">
        <button class="btn" onclick="resetGame()">Reset Game</button>
        <button class="btn" onclick="undoMove()">Undo</button>
        <button class="btn btn-primary" onclick="makePersonaMove()">Ask Opponent Move</button>
      </div>

      <div style="width: 100%;">
        <div style="font-size: 0.75rem; color: #8b949e; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Move History</div>
        <div id="historyList" class="history-list"></div>
      </div>
    </div>

    <!-- Right: Studio Intelligence Panels -->
    <div class="studio">
      <!-- Natural Language Move Resolver -->
      <div class="panel">
        <div class="panel-title">
          <span>Natural Language Move Intent</span>
          <span class="panel-subtitle">Select Instead of Generate (Choice)</span>
        </div>
        <div class="nl-input-row">
          <input id="nlInput" class="nl-input" type="text" placeholder="e.g. Develop knight towards center, Castle kingside..." onkeydown="if(event.key==='Enter') resolveAndPlayMove()" />
          <button class="btn btn-accent" onclick="resolveAndPlayMove()">Resolve & Play</button>
        </div>
        <div class="quick-chips">
          <div class="chip" onclick="setChip('Develop knight towards center and attack pawn')">Develop knight to f3</div>
          <div class="chip" onclick="setChip('Push the queen pawn two squares forward')">Push d-pawn two squares</div>
          <div class="chip" onclick="setChip('Castle to safety on the kingside')">Castle kingside</div>
          <div class="chip" onclick="setChip('Attack with bishop on f7')">Sacrifice bishop on f7</div>
          <div class="chip" onclick="setChip('Teleport rook across board')">Illegal Teleport (Test Fallback)</div>
        </div>
        <div id="resolutionResult" class="resolution-banner" style="display: none;">
          <span id="resText">...</span>
          <span id="resConf" style="font-weight: 700; color: var(--accent);"></span>
        </div>
      </div>

      <!-- Live Move Intelligence -->
      <div class="panel">
        <div class="panel-title">
          <span>System One Move Intelligence</span>
          <span id="lastMoveBadge" style="font-size: 0.78rem; font-weight: 600; padding: 3px 10px; border-radius: 4px; background: #21262d; color: var(--text-bright); border: 1px solid var(--card-border);">Waiting for move...</span>
        </div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-name">Tactical Sharpness (Score)</div>
            <div class="metric-value">
              <span id="mSharp">--</span>
              <span class="metric-sub">/ 3.0</span>
            </div>
            <div class="progress-bar"><div id="mSharpBar" class="progress-fill"></div></div>
          </div>

          <div class="metric-card">
            <div class="metric-name">Strategic Motif (Choice)</div>
            <div class="metric-value" style="font-size: 1rem;" id="mTheme">--</div>
            <div class="metric-sub" id="mThemeConf">Confidence: --</div>
          </div>

          <div class="metric-card">
            <div class="metric-name">King Threat (Noul)</div>
            <div class="metric-value"><span id="mKing">--</span></div>
            <div class="progress-bar"><div id="mKingBar" class="progress-fill" style="background: var(--danger);"></div></div>
          </div>

          <div class="metric-card">
            <div class="metric-name">Psychological Pressure (Noul)</div>
            <div class="metric-value"><span id="mPressure">--</span></div>
            <div class="progress-bar"><div id="mPressureBar" class="progress-fill" style="background: var(--warning);"></div></div>
          </div>
        </div>
      </div>

      <!-- Persona AI Opponent -->
      <div class="panel">
        <div class="panel-title">
          <span>Persona AI Opponent</span>
          <span class="panel-subtitle">Composite Scoring: weights · dimensions</span>
        </div>
        <div class="persona-select-grid">
          <div class="persona-card active" onclick="selectPersona('tal', this)">
            <div class="persona-name">Tal</div>
            <div class="persona-title">Aggression & Chaos</div>
          </div>
          <div class="persona-card" onclick="selectPersona('petrosian', this)">
            <div class="persona-name">Petrosian</div>
            <div class="persona-title">Iron Prophylaxis</div>
          </div>
          <div class="persona-card" onclick="selectPersona('capablanca', this)">
            <div class="persona-name">Capablanca</div>
            <div class="persona-title">Simplification</div>
          </div>
          <div class="persona-card" onclick="selectPersona('coffeehouse', this)">
            <div class="persona-name">Coffeehouse</div>
            <div class="persona-title">Romantic Gambits</div>
          </div>
        </div>
        <div id="personaRationale" class="persona-breakdown">
          Select an opponent archetype and click "Ask Opponent Move" to watch TypeSafe score candidate moves across atomic dimensions.
        </div>
      </div>

      <!-- Classic Matches & Game Classification -->
      <div class="panel">
        <div class="panel-title">
          <span>Classic Matches & Replay Studio</span>
          <span class="panel-subtitle">Historic Games & System One Classification</span>
        </div>

        <select id="matchSelect" class="match-select" onchange="onMatchSelectChange(this.value)">
          <option value="">Loading classic games...</option>
        </select>

        <div id="matchMetaBox" class="match-meta-box" style="display: none;">
          <div class="match-meta-header">
            <span id="matchPlayers" class="match-players"></span>
            <span id="matchYearEvent" style="color: #8b949e; font-size: 0.75rem;"></span>
          </div>
          <div id="matchDesc" style="color: var(--text); margin-top: 4px;"></div>
          <div class="match-tags">
            <span id="matchEco" class="match-tag"></span>
            <span id="matchOpening" class="match-tag"></span>
            <span id="matchResult" class="match-tag result"></span>
          </div>
        </div>

        <!-- Replay Toolbar -->
        <div class="replay-bar">
          <button class="replay-btn" onclick="stepFirst()" title="First Position">|&lt;</button>
          <button class="replay-btn" onclick="stepPrev()" title="Previous Move">&lt;</button>
          <button class="replay-btn" onclick="stepNext()" title="Next Move">&gt;</button>
          <button class="replay-btn" onclick="stepLast()" title="Final Position">&gt;|</button>
          <button id="autoPlayBtn" class="replay-btn" onclick="toggleAutoPlay()">Auto Play</button>
          <button class="replay-btn" onclick="jumpToTurningPoint()" style="color: var(--accent);">Turning Point</button>
        </div>

        <div class="replay-progress-wrap" style="margin-top: 10px;">
          <div class="replay-progress-text">
            <span id="replayMoveLabel">Move 0 / 0</span>
            <span id="replayTurnLabel">Initial Position</span>
          </div>
          <div class="progress-bar"><div id="replayProgressBar" class="progress-fill" style="width: 0%;"></div></div>
        </div>

        <!-- Classify Button -->
        <div style="margin-top: 14px;">
          <button id="classifyBtn" class="btn btn-accent" style="width: 100%;" onclick="classifyCurrentMatch()">
            Classify Match with System One
          </button>
        </div>

        <!-- Classification Results Card -->
        <div id="classificationCard" class="classification-panel" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div id="classArchetype" class="archetype-banner">ARCHETYPE</div>
            <span id="classSacrifice" style="font-size: 0.75rem; color: #8b949e;"></span>
          </div>

          <div class="class-grid">
            <div class="class-stat">
              <span class="class-stat-name">Brilliance</span>
              <span id="classBrillianceScore" class="class-stat-val">--</span>
              <span id="classBrillianceLevel" class="class-stat-desc">--</span>
            </div>
            <div class="class-stat">
              <span class="class-stat-name">Sharpness</span>
              <span id="classSharpnessScore" class="class-stat-val">--</span>
              <span id="classSharpnessLevel" class="class-stat-desc">--</span>
            </div>
            <div class="class-stat">
              <span class="class-stat-name">Turning Point</span>
              <span id="classTurningMove" class="class-stat-val" style="color: var(--accent);">--</span>
              <span id="classTurningNum" class="class-stat-desc">Move --</span>
            </div>
          </div>

          <div style="font-size: 0.75rem; color: #8b949e; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Strategic Profile</div>
          <div class="breakdown-row">
            <div class="breakdown-pill">Tactical: <strong id="bdTactical" style="color: var(--text-bright);">0%</strong></div>
            <div class="breakdown-pill">Pawns: <strong id="bdPawn" style="color: var(--text-bright);">0%</strong></div>
            <div class="breakdown-pill">Piece Play: <strong id="bdPiece" style="color: var(--text-bright);">0%</strong></div>
            <div class="breakdown-pill">Prophylaxis: <strong id="bdProphyl" style="color: var(--text-bright);">0%</strong></div>
          </div>

          <div id="classVerdict" style="background: #161b22; border: 1px solid var(--card-border); border-radius: 6px; padding: 10px 12px; font-size: 0.8rem; color: var(--text); line-height: 1.5;">
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
    const PIECE_UNICODE = {
      p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
      P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'
    };

    let selectedSquare = null;
    let legalMoves = [];
    let currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    let activePersona = "tal";
    let lastFrom = null;
    let lastTo = null;

    // Classic match state
    let classicMatches = [];
    let activeMatch = null;
    let matchMoveIndex = 0;
    let autoPlayTimer = null;

    function renderBoard(fen) {
      const boardEl = document.getElementById('board');
      boardEl.innerHTML = '';
      const [placement, turn] = fen.split(' ');

      const turnDot = document.getElementById('turnDot');
      const turnLabel = document.getElementById('turnLabel');
      if (turn === 'w') {
        turnDot.className = 'turn-dot white';
        turnLabel.innerText = 'White to move';
      } else {
        turnDot.className = 'turn-dot black';
        turnLabel.innerText = 'Black to move';
      }

      const rows = placement.split('/');
      for (let r = 0; r < 8; r++) {
        let col = 0;
        for (let ch of rows[r]) {
          if (!isNaN(ch)) {
            for (let empty = 0; empty < parseInt(ch); empty++) {
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

    function createSquare(r, c, piece) {
      const files = ['a','b','c','d','e','f','g','h'];
      const ranks = ['8','7','6','5','4','3','2','1'];
      const sqName = files[c] + ranks[r];
      const isLight = (r + c) % 2 === 0;

      const div = document.createElement('div');
      div.className = 'square ' + (isLight ? 'light' : 'dark');
      div.dataset.sq = sqName;

      if (sqName === selectedSquare) div.classList.add('selected');
      if (sqName === lastFrom) div.classList.add('last-from');
      if (sqName === lastTo) div.classList.add('last-to');

      if (selectedSquare) {
        const canMove = legalMoves.some(m => m.from === selectedSquare && m.to === sqName);
        if (canMove) div.classList.add('target');
      }

      if (c === 0) {
        const rankLabel = document.createElement('span');
        rankLabel.className = 'coord-label coord-rank';
        rankLabel.innerText = ranks[r];
        div.appendChild(rankLabel);
      }
      if (r === 7) {
        const fileLabel = document.createElement('span');
        fileLabel.className = 'coord-label coord-file';
        fileLabel.innerText = files[c];
        div.appendChild(fileLabel);
      }

      if (piece) {
        const span = document.createElement('span');
        span.innerText = PIECE_UNICODE[piece] || piece;
        div.appendChild(span);
      }

      div.onclick = () => onSquareClick(sqName);
      document.getElementById('board').appendChild(div);
    }

    async function fetchLegalMoves() {
      const res = await fetch('/api/legal-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentFen })
      });
      const data = await res.json();
      legalMoves = data.moves || [];
      document.getElementById('materialBalance').innerText = data.material || 'Equal';
      updateHistory(data.history || []);
    }

    function updateHistory(history) {
      const el = document.getElementById('historyList');
      if (!history || history.length === 0) {
        el.innerHTML = '<span style="color: #666;">No moves played yet</span>';
        return;
      }
      el.innerHTML = history.map((m, i) => '<span class="history-item">' + (i % 2 === 0 ? Math.floor(i/2 + 1) + '. ' : '') + m + '</span>').join(' ');
      el.scrollTop = el.scrollHeight;
    }

    async function onSquareClick(sq) {
      if (selectedSquare) {
        const move = legalMoves.find(m => m.from === selectedSquare && m.to === sq);
        if (move) {
          await playMove(move.san);
          selectedSquare = null;
          return;
        }
      }
      const hasMoves = legalMoves.some(m => m.from === sq);
      selectedSquare = hasMoves ? sq : null;
      renderBoard(currentFen);
    }

    async function playMove(san) {
      const res = await fetch('/api/make-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentFen, san })
      });
      const data = await res.json();
      if (data.success) {
        lastFrom = data.move.from;
        lastTo = data.move.to;
        currentFen = data.fen;
        renderBoard(currentFen);
        await fetchLegalMoves();
        updateIntelligence(data.evaluation);
      }
    }

    function formatTheme(theme) {
      if (!theme) return '--';
      return theme.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function updateIntelligence(ev) {
      if (!ev) return;
      document.getElementById('lastMoveBadge').innerText = ev.commentaryBadge || 'Move Evaluated';
      document.getElementById('mSharp').innerText = ev.tacticalSharpness.score.toFixed(1);
      document.getElementById('mSharpBar').style.width = Math.min(100, (ev.tacticalSharpness.score / 3.0) * 100) + '%';
      document.getElementById('mTheme').innerText = formatTheme(ev.strategicTheme.theme);
      document.getElementById('mThemeConf').innerText = 'Confidence: ' + (ev.strategicTheme.confidence * 100).toFixed(0) + '%';
      document.getElementById('mKing').innerText = (ev.kingAttackRisk.probability * 100).toFixed(0) + '%';
      document.getElementById('mKingBar').style.width = (ev.kingAttackRisk.probability * 100) + '%';
      document.getElementById('mPressure').innerText = (ev.psychologicalPressure.probability * 100).toFixed(0) + '%';
      document.getElementById('mPressureBar').style.width = (ev.psychologicalPressure.probability * 100) + '%';
    }

    function resetIntelligence() {
      document.getElementById('lastMoveBadge').innerText = 'Waiting for move...';
      document.getElementById('mSharp').innerText = '--';
      document.getElementById('mSharpBar').style.width = '0%';
      document.getElementById('mTheme').innerText = '--';
      document.getElementById('mThemeConf').innerText = 'Confidence: --';
      document.getElementById('mKing').innerText = '--';
      document.getElementById('mKingBar').style.width = '0%';
      document.getElementById('mPressure').innerText = '--';
      document.getElementById('mPressureBar').style.width = '0%';
    }

    async function resolveAndPlayMove() {
      const input = document.getElementById('nlInput');
      const q = input.value.trim();
      if (!q) return;

      const banner = document.getElementById('resolutionResult');
      const resText = document.getElementById('resText');
      const resConf = document.getElementById('resConf');
      banner.style.display = 'flex';
      resText.innerText = 'Resolving intent via TypeSafe Choice...';
      resConf.innerText = '';

      const res = await fetch('/api/resolve-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, fen: currentFen })
      });
      const data = await res.json();

      if (data.matchedMove) {
        resText.innerText = 'Matched: ' + data.matchedMove.san + ' (' + data.matchedMove.description + ')';
        resConf.innerText = (data.confidence * 100).toFixed(1) + '% confidence';
        input.value = '';
        await playMove(data.matchedMove.san);
      } else {
        resText.innerText = 'Ambiguous: ' + (data.alternativeCandidates?.join(', ') || 'No legal match');
        resConf.innerText = 'Low confidence (' + (data.confidence * 100).toFixed(1) + '%)';
      }
    }

    function setChip(txt) {
      document.getElementById('nlInput').value = txt;
      resolveAndPlayMove();
    }

    function selectPersona(id, el) {
      activePersona = id;
      document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
    }

    async function makePersonaMove() {
      const rationaleEl = document.getElementById('personaRationale');
      rationaleEl.innerText = 'Evaluating candidates with TypeSafe Composite Scoring...';

      const res = await fetch('/api/persona-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: activePersona, fen: currentFen })
      });
      const data = await res.json();
      if (data.success) {
        rationaleEl.innerText = data.decision.rationale;
        await playMove(data.decision.selectedMove.san);
      } else {
        rationaleEl.innerText = data.error || 'Unable to make persona move.';
      }
    }

    async function resetGame() {
      stopAutoPlay();
      currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      lastFrom = null;
      lastTo = null;
      selectedSquare = null;
      document.getElementById('resolutionResult').style.display = 'none';
      renderBoard(currentFen);
      await fetchLegalMoves();
      resetIntelligence();
    }

    async function undoMove() {
      stopAutoPlay();
      const res = await fetch('/api/undo-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentFen })
      });
      const data = await res.json();
      if (data.success) {
        currentFen = data.fen;
        renderBoard(currentFen);
        await fetchLegalMoves();
      }
    }

    /* Classic Matches Functions */
    async function initClassicMatches() {
      try {
        const res = await fetch('/api/classic-matches');
        classicMatches = await res.json();
        const select = document.getElementById('matchSelect');
        select.innerHTML = classicMatches.map(m =>
          '<option value="' + m.id + '">' + m.title + ' (' + m.year + ') — ' + m.white + ' vs ' + m.black + '</option>'
        ).join('');

        if (classicMatches.length > 0) {
          selectMatch(classicMatches[0].id);
        }
      } catch (e) {
        console.error('Failed to load classic matches', e);
      }
    }

    function onMatchSelectChange(matchId) {
      if (matchId) selectMatch(matchId);
    }

    async function selectMatch(matchId) {
      stopAutoPlay();
      activeMatch = classicMatches.find(m => m.id === matchId);
      if (!activeMatch) return;

      // Update meta UI
      const metaBox = document.getElementById('matchMetaBox');
      metaBox.style.display = 'block';
      document.getElementById('matchPlayers').innerText = activeMatch.white + ' vs ' + activeMatch.black;
      document.getElementById('matchYearEvent').innerText = activeMatch.year + ' · ' + activeMatch.event;
      document.getElementById('matchDesc').innerText = activeMatch.description;
      document.getElementById('matchEco').innerText = activeMatch.eco;
      document.getElementById('matchOpening').innerText = activeMatch.opening;
      document.getElementById('matchResult').innerText = activeMatch.result;

      // Reset replay state to move 0
      await goToReplayMove(0);
      document.getElementById('classificationCard').style.display = 'none';
    }

    async function goToReplayMove(index) {
      if (!activeMatch) return;
      const target = Math.max(0, Math.min(activeMatch.moves.length, index));
      matchMoveIndex = target;

      // Update progress indicators
      document.getElementById('replayMoveLabel').innerText = 'Move ' + matchMoveIndex + ' / ' + activeMatch.moves.length;
      const pct = (matchMoveIndex / Math.max(1, activeMatch.moves.length)) * 100;
      document.getElementById('replayProgressBar').style.width = pct + '%';

      if (matchMoveIndex === 0) {
        document.getElementById('replayTurnLabel').innerText = 'Starting Position';
      } else {
        const lastSan = activeMatch.moves[matchMoveIndex - 1];
        const moveNum = Math.floor((matchMoveIndex - 1) / 2) + 1;
        const color = (matchMoveIndex - 1) % 2 === 0 ? 'White' : 'Black';
        document.getElementById('replayTurnLabel').innerText = moveNum + (color === 'White' ? '. ' : '... ') + lastSan;
      }

      const res = await fetch('/api/replay-to-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: activeMatch.id, moveIndex: matchMoveIndex })
      });
      const data = await res.json();

      currentFen = data.fen;
      if (data.move) {
        lastFrom = data.move.from;
        lastTo = data.move.to;
      } else {
        lastFrom = null;
        lastTo = null;
      }

      legalMoves = data.moves || [];
      document.getElementById('materialBalance').innerText = data.material || 'Equal';
      updateHistory(data.history || []);
      renderBoard(currentFen);

      if (data.evaluation) {
        updateIntelligence(data.evaluation);
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
        document.getElementById('autoPlayBtn').innerText = 'Pause';
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
        const btn = document.getElementById('autoPlayBtn');
        if (btn) btn.innerText = 'Auto Play';
      }
    }

    async function classifyCurrentMatch() {
      if (!activeMatch) return;
      const btn = document.getElementById('classifyBtn');
      btn.innerText = 'Classifying with System One...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/classify-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: activeMatch.id })
        });
        const cl = await res.json();

        document.getElementById('classificationCard').style.display = 'flex';
        document.getElementById('classArchetype').innerText = cl.archetype;
        document.getElementById('classSacrifice').innerText = cl.hasDecisiveSacrifice ? 'Decisive Sacrifice Confirmed' : 'No Decisive Sacrifice';
        document.getElementById('classBrillianceScore').innerText = cl.aestheticBrilliance.score.toFixed(1) + ' / 3.0';
        document.getElementById('classBrillianceLevel').innerText = cl.aestheticBrilliance.level;
        document.getElementById('classSharpnessScore').innerText = cl.overallSharpness.score.toFixed(1) + ' / 3.0';
        document.getElementById('classSharpnessLevel').innerText = cl.overallSharpness.level;
        document.getElementById('classTurningMove').innerText = cl.turningPoint.san;
        document.getElementById('classTurningNum').innerText = 'Move ' + cl.turningPoint.moveNumber;

        document.getElementById('bdTactical').innerText = cl.strategicBreakdown.tacticalStrikesPct + '%';
        document.getElementById('bdPawn').innerText = cl.strategicBreakdown.pawnBreaksPct + '%';
        document.getElementById('bdPiece').innerText = cl.strategicBreakdown.pieceActivationPct + '%';
        document.getElementById('bdProphyl').innerText = cl.strategicBreakdown.prophylaxisPct + '%';

        document.getElementById('classVerdict').innerText = cl.verdict;
      } catch (e) {
        console.error('Failed to classify match', e);
      } finally {
        btn.innerText = 'Classify Match with System One';
        btn.disabled = false;
      }
    }

    /* API Key Configuration Functions */
    async function checkKeyStatus() {
      try {
        const res = await fetch('/api/key-status');
        const data = await res.json();
        const badge = document.getElementById('backendBadge');
        const dot = document.getElementById('backendStatusDot');
        const text = document.getElementById('backendStatusText');
        const btnLabel = document.getElementById('keyBtnLabel');

        if (data.isLive) {
          badge.className = 'badge-status';
          dot.className = 'status-dot live';
          text.innerText = 'Live API (jev-latest)';
          btnLabel.innerText = data.maskedKey || 'Live Key';
        } else {
          badge.className = 'badge-status badge-sim';
          dot.className = 'status-dot sim';
          text.innerText = 'Simulation Mode (jev-latest calibrated)';
          btnLabel.innerText = 'API Key';
        }
      } catch (e) {
        console.error('Failed to check key status', e);
      }
    }

    function openKeyModal() {
      document.getElementById('keyModal').style.display = 'flex';
      document.getElementById('modalStatus').innerText = '';
    }

    function closeKeyModal() {
      document.getElementById('keyModal').style.display = 'none';
    }

    function toggleKeyVisibility() {
      const input = document.getElementById('keyInput');
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      event.target.innerText = isPass ? 'Hide' : 'Show';
    }

    async function saveApiKey() {
      const input = document.getElementById('keyInput');
      const key = input.value.trim();
      const statusEl = document.getElementById('modalStatus');
      if (!key) {
        statusEl.innerHTML = '<span style="color: var(--danger)">Please enter a valid API key.</span>';
        return;
      }
      statusEl.innerHTML = '<span style="color: var(--accent)">Connecting to TypeSafe API...</span>';

      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();
      if (data.success) {
        statusEl.innerHTML = '<span style="color: var(--success)">Successfully connected to live jev-latest model.</span>';
        input.value = '';
        await checkKeyStatus();
        setTimeout(closeKeyModal, 1200);
      } else {
        statusEl.innerHTML = '<span style="color: var(--danger)">' + (data.error || 'Failed to set key') + '</span>';
      }
    }

    async function clearApiKey() {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' })
      });
      await res.json();
      document.getElementById('modalStatus').innerHTML = '<span style="color: var(--warning)">Switched back to calibrated simulation mode.</span>';
      await checkKeyStatus();
      setTimeout(closeKeyModal, 900);
    }

    // Initial setup
    renderBoard(currentFen);
    fetchLegalMoves();
    checkKeyStatus();
    initClassicMatches();
  </script>
</body>
</html>`;
}

// Global active engine instance for the session
let activeEngine = new ChessEngine();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/key-status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getApiKeyStatus()));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/classic-matches") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(CLASSIC_MATCHES));
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (req.method === "HEAD") {
      res.end();
    } else {
      res.end(getHtml());
    }
    return;
  }

  // Helper to parse JSON body
  async function readBody(): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  if (req.method === "POST") {
    try {
      const body = await readBody();

      if (url.pathname === "/api/set-key") {
        setApiKey(body.apiKey);
        const status = getApiKeyStatus();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, ...status }));
        return;
      }

      if (url.pathname === "/api/classify-match") {
        const match = CLASSIC_MATCHES.find((m) => m.id === body.matchId);
        if (!match) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Match not found" }));
          return;
        }
        const classification = await matchStudio.classifyMatch(match);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(classification));
        return;
      }

      if (url.pathname === "/api/replay-to-move") {
        const match = CLASSIC_MATCHES.find((m) => m.id === body.matchId);
        if (!match) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Match not found" }));
          return;
        }
        activeEngine.reset();
        let lastEvaluatedMove: any = null;
        const target = Math.max(0, Math.min(match.moves.length, Number(body.moveIndex) || 0));
        for (let i = 0; i < target; i++) {
          const mv = activeEngine.makeMove(match.moves[i]!);
          if (i === target - 1) {
            lastEvaluatedMove = mv;
          }
        }
        let evaluation = null;
        if (lastEvaluatedMove) {
          evaluation = await evaluator.evaluateMove(activeEngine, lastEvaluatedMove);
        }
        const moves = activeEngine.getAnnotatedMoves();
        const mat = activeEngine.getMaterialBalance();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            fen: activeEngine.fen(),
            move: lastEvaluatedMove,
            evaluation,
            material: mat.description,
            history: activeEngine.history(),
            moves,
          })
        );
        return;
      }

      if (url.pathname === "/api/legal-moves") {
        if (body.fen && body.fen !== activeEngine.fen()) {
          activeEngine.load(body.fen);
        }
        const moves = activeEngine.getAnnotatedMoves();
        const mat = activeEngine.getMaterialBalance();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ moves, material: mat.description, history: activeEngine.history() }));
        return;
      }

      if (url.pathname === "/api/make-move") {
        if (body.fen && body.fen !== activeEngine.fen()) {
          activeEngine.load(body.fen);
        }
        const move = activeEngine.makeMove(body.san);
        if (!move) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Illegal move" }));
          return;
        }
        const evaluation = await evaluator.evaluateMove(activeEngine, move);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, fen: activeEngine.fen(), move, evaluation }));
        return;
      }

      if (url.pathname === "/api/resolve-move") {
        if (body.fen && body.fen !== activeEngine.fen()) {
          activeEngine.load(body.fen);
        }
        const result = await resolver.resolveIntent(activeEngine, body.query);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }

      if (url.pathname === "/api/persona-move") {
        if (body.fen && body.fen !== activeEngine.fen()) {
          activeEngine.load(body.fen);
        }
        const decision = await personaEngine.selectMove(activeEngine, body.personaId || "tal");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, decision }));
        return;
      }

      if (url.pathname === "/api/undo-move") {
        activeEngine.chess.undo();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, fen: activeEngine.fen() }));
        return;
      }
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err?.message || "Internal server error" }));
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`Jev Chess Web Studio running live at http://localhost:${PORT}`);
});
