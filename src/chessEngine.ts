import { Chess, type PieceSymbol, type Square } from "chess.js";
import type { AnnotatedMove, BoardContext, GamePhase, MaterialBalance } from "./types.js";

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export class ChessEngine {
  public chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  public reset(): void {
    this.chess.reset();
  }

  public load(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  public fen(): string {
    return this.chess.fen();
  }

  public turn(): "white" | "black" {
    return this.chess.turn() === "w" ? "white" : "black";
  }

  public isCheck(): boolean {
    return this.chess.inCheck();
  }

  public isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  public history(): string[] {
    return this.chess.history();
  }

  /**
   * Generates all legal moves in the current position, richly annotated with semantic facts.
   * This is 100% deterministic code.
   */
  public getAnnotatedMoves(): AnnotatedMove[] {
    const rawMoves = this.chess.moves({ verbose: true });
    return rawMoves.map((m) => {
      const pieceName = PIECE_NAMES[m.piece] ?? m.piece;
      const isCastling = m.san === "O-O" || m.san === "O-O-O";
      const isCapture = Boolean(m.captured);
      const capturedName = m.captured ? PIECE_NAMES[m.captured] : undefined;

      let description = `${pieceName} moves from ${m.from} to ${m.to}`;
      if (isCastling) {
        description = m.san === "O-O" ? "Kingside castle" : "Queenside castle";
      } else if (isCapture) {
        description = `${pieceName} on ${m.from} captures ${capturedName} on ${m.to}`;
      }
      if (m.san.includes("+")) {
        description += " with check";
      } else if (m.san.includes("#")) {
        description += " with checkmate!";
      }

      return {
        san: m.san,
        from: m.from,
        to: m.to,
        piece: pieceName,
        color: m.color === "w" ? "white" : "black",
        isCapture,
        capturedPiece: capturedName,
        isCheck: m.san.includes("+") || m.san.includes("#"),
        isCastling,
        description,
      };
    });
  }

  /**
   * Calculates material balance between white and black.
   */
  public getMaterialBalance(): MaterialBalance {
    const board = this.chess.board();
    let whiteScore = 0;
    let blackScore = 0;

    for (const row of board) {
      for (const square of row) {
        if (!square) continue;
        const val = PIECE_VALUES[square.type];
        if (square.color === "w") whiteScore += val;
        else blackScore += val;
      }
    }

    const diff = whiteScore - blackScore;
    let description = "Material is exactly equal";
    if (diff > 0) {
      description = `White is up +${diff} point${diff > 1 ? "s" : ""}`;
    } else if (diff < 0) {
      description = `Black is up +${Math.abs(diff)} point${Math.abs(diff) > 1 ? "s" : ""}`;
    }

    return { whiteScore, blackScore, diff, description };
  }

  /**
   * Deterministically infers game phase based on remaining major/minor pieces and move number.
   */
  public getGamePhase(): GamePhase {
    const board = this.chess.board();
    let totalPieces = 0;
    let queenCount = 0;

    for (const row of board) {
      for (const square of row) {
        if (!square) continue;
        if (square.type !== "p" && square.type !== "k") {
          totalPieces++;
          if (square.type === "q") queenCount++;
        }
      }
    }

    const moveCount = this.chess.history().length;
    if (moveCount < 16 && totalPieces >= 12) {
      return "opening";
    }
    if (totalPieces <= 6 || queenCount === 0) {
      return "endgame";
    }
    return "middlegame";
  }

  /**
   * Creates the complete structured context representing the board.
   * This matches TypeSafe's principle: provide clear, structured JSON state.
   */
  public getBoardContext(): BoardContext {
    const history = this.chess.history();
    const recentHistory = history.slice(-6);

    return {
      fen: this.chess.fen(),
      turn: this.turn(),
      moveNumber: Math.floor(history.length / 2) + 1,
      inCheck: this.isCheck(),
      materialBalance: this.getMaterialBalance(),
      gamePhase: this.getGamePhase(),
      recentHistory,
      candidateMoves: this.getAnnotatedMoves(),
    };
  }

  /**
   * Deterministically applies a move in SAN (Standard Algebraic Notation).
   */
  public makeMove(sanOrUci: string): AnnotatedMove | null {
    const candidate = this.getAnnotatedMoves().find(
      (m) => m.san === sanOrUci || `${m.from}${m.to}` === sanOrUci
    );
    if (!candidate) {
      return null;
    }

    this.chess.move(candidate.san);
    return candidate;
  }
}
