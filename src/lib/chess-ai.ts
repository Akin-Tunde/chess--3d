import { Chess, Move } from 'chess.js';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

function evaluateBoard(chess: Chess): number {
  let totalEvaluation = 0;
  const board = chess.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const val = pieceValues[piece.type] || 0;
        totalEvaluation += piece.color === 'w' ? val : -val;
      }
    }
  }
  return totalEvaluation;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves();

  if (isMaximizingPlayer) {
    let bestVal = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      bestVal = Math.max(bestVal, minimax(chess, depth - 1, alpha, beta, !isMaximizingPlayer));
      chess.undo();
      alpha = Math.max(alpha, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  } else {
    let bestVal = Infinity;
    for (let i = 0; i < moves.length; i++) {
      chess.move(moves[i]);
      bestVal = Math.min(bestVal, minimax(chess, depth - 1, alpha, beta, !isMaximizingPlayer));
      chess.undo();
      beta = Math.min(beta, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  }
}

export function getAIMove(chess: Chess, difficulty: AIDifficulty): string | null {
  const moves = chess.moves();
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === 'medium') {
    let bestMove = null;
    let bestValue = chess.turn() === 'w' ? -Infinity : Infinity;

    for (let move of moves) {
      chess.move(move);
      const boardValue = evaluateBoard(chess);
      chess.undo();

      if (chess.turn() === 'w') {
        if (boardValue > bestValue) {
          bestValue = boardValue;
          bestMove = move;
        }
      } else {
        if (boardValue < bestValue) {
          bestValue = boardValue;
          bestMove = move;
        }
      }
    }
    
    // Add some randomness to medium if no piece capture is obviously better
    if (!bestMove || Math.random() < 0.2) {
       bestMove = moves[Math.floor(Math.random() * moves.length)];
    }
    return bestMove;
  }

  // Hard: Minimax depth 3
  let bestMove = null;
  let bestValue = chess.turn() === 'w' ? -Infinity : Infinity;
  const isMaximizingPlayer = chess.turn() === 'w';

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    chess.move(move);
    const boardValue = minimax(chess, 2, -Infinity, Infinity, !isMaximizingPlayer);
    chess.undo();

    if (isMaximizingPlayer) {
      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    } else {
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
  }

  return bestMove || moves[0];
}
