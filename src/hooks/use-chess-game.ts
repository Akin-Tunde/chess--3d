import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { getAIMove, AIDifficulty } from '@/lib/chess-ai';
import { getOpeningName } from '@/lib/openings';
import {
  playMoveSound,
  playCaptureSound,
  playCastleSound,
  playCheckSound,
  playPromotionSound,
} from '@/lib/sounds';

export type GameMode = 'ai' | 'local' | 'aivai';

function getSoundForMove(result: Move, inCheck: boolean) {
  if (result.flags?.includes('k') || result.flags?.includes('q')) {
    playCastleSound();
  } else if (result.flags?.includes('p')) {
    playPromotionSound();
  } else if (result.flags?.includes('c') || result.flags?.includes('e')) {
    playCaptureSound();
  } else {
    playMoveSound();
  }
  if (inCheck) {
    setTimeout(playCheckSound, 180);
  }
}

export function getMoveSoundFlags(result: Move) {
  return {
    capture: result.flags?.includes('c') || result.flags?.includes('e'),
    castle: result.flags?.includes('k') || result.flags?.includes('q'),
    promotion: result.flags?.includes('p'),
  };
}

export interface UseChessGameOptions {
  initialMode?: GameMode;
  /** White/player difficulty (also used as the single AI in 'ai' mode) */
  difficulty?: AIDifficulty;
  /** Black AI difficulty — used only in 'aivai' mode */
  difficulty2?: AIDifficulty;
  /** Delay (ms) between AI moves in 'aivai' mode */
  moveDelay?: number;
}

export function useChessGame({
  initialMode = 'ai',
  difficulty = 'medium',
  difficulty2 = 'medium',
  moveDelay = 700,
}: UseChessGameOptions = {}) {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(() => chess.fen());
  const [history, setHistory] = useState<Move[]>([]);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(difficulty);
  const [aiDifficulty2, setAiDifficulty2] = useState<AIDifficulty>(difficulty2);
  const [isThinking, setIsThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [openingName, setOpeningName] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Use a ref so the AI timeout always reads the latest moveDelay
  const moveDelayRef = useRef(moveDelay);
  useEffect(() => { moveDelayRef.current = moveDelay; }, [moveDelay]);

  const updateState = useCallback(() => {
    const newFen = chess.fen();
    const newHistory = chess.history({ verbose: true }) as Move[];
    setFen(newFen);
    setHistory(newHistory);
    setLastMove(newHistory[newHistory.length - 1] ?? null);

    // Opening detection
    const sanHistory = chess.history();
    setOpeningName(getOpeningName(sanHistory));

    // Game status
    if (chess.isCheckmate()) {
      setGameStatus(`Checkmate — ${chess.turn() === 'w' ? 'Black' : 'White'} wins`);
    } else if (chess.isStalemate()) {
      setGameStatus('Stalemate');
    } else if (chess.isDraw()) {
      setGameStatus('Draw');
    } else if (chess.inCheck()) {
      setGameStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} in check`);
    } else {
      setGameStatus('');
    }
  }, [chess]);

  const makeMove = useCallback(
    (move: string | { from: string; to: string; promotion?: string }) => {
      try {
        const result = chess.move(move);
        if (result) {
          updateState();
          getSoundForMove(result, chess.inCheck());
          return true;
        }
      } catch {
        return false;
      }
      return false;
    },
    [chess, updateState]
  );

  const resetGame = useCallback(() => {
    chess.reset();
    setLastMove(null);
    setGameStatus('');
    setOpeningName(null);
    setIsThinking(false);
    setIsPaused(false);
    updateState();
  }, [chess, updateState]);

  const undoMove = useCallback(() => {
    chess.undo();
    if (mode === 'ai') chess.undo();
    updateState();
  }, [chess, mode, updateState]);

  // ── AI vs human effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'ai' || chess.isGameOver() || chess.turn() === playerColor) {
      return undefined;
    }
    setIsThinking(true);
    const timer = setTimeout(() => {
      const aiMove = getAIMove(chess, aiDifficulty);
      if (aiMove) {
        const result = chess.move(aiMove);
        updateState();
        if (result) getSoundForMove(result, chess.inCheck());
      }
      setIsThinking(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [fen, mode, playerColor, aiDifficulty, chess, updateState]);

  // ── AI vs AI effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'aivai' || chess.isGameOver() || isPaused) {
      return undefined;
    }
    setIsThinking(true);
    const timer = setTimeout(() => {
      const currentDiff = chess.turn() === 'w' ? aiDifficulty : aiDifficulty2;
      const aiMove = getAIMove(chess, currentDiff);
      if (aiMove) {
        const result = chess.move(aiMove);
        updateState();
        if (result) getSoundForMove(result, chess.inCheck());
      }
      setIsThinking(false);
    }, moveDelayRef.current);
    return () => clearTimeout(timer);
  }, [fen, mode, isPaused, aiDifficulty, aiDifficulty2, chess, updateState]);

  return {
    chess,
    fen,
    history,
    lastMove,
    gameStatus,
    openingName,
    makeMove,
    resetGame,
    undoMove,
    isThinking,
    isPaused,
    setIsPaused,
    mode,
    setMode,
    aiDifficulty,
    setAiDifficulty,
    aiDifficulty2,
    setAiDifficulty2,
    playerColor,
    setPlayerColor,
  };
}
