import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Board3D } from '@/components/chess/board3d';
import { MoveHistory } from '@/components/chess/history';
import { EvalBar } from '@/components/chess/eval-bar';
import { PlayerCard } from '@/components/chess/player-card';
import { useChessGame, GameMode } from '@/hooks/use-chess-game';
import { useGameClock } from '@/hooks/use-clock';
import { AIDifficulty } from '@/lib/chess-ai';
import { playGameEndSound } from '@/lib/sounds';
import { Chess } from 'chess.js';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const INITIAL_COUNTS: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

const DIFF_LABEL: Record<AIDifficulty, string> = { easy: 'Beginner', medium: 'Tactician', hard: 'Master' };

const SPEED_LABELS: Record<number, { label: string; icon: string }> = {
  2000: { label: 'Slow',   icon: '🐢' },
  700:  { label: 'Normal', icon: '⚡' },
  250:  { label: 'Fast',   icon: '🔥' },
  60:   { label: 'Blitz',  icon: '💨' },
};

function getCapturedPieces(chess: Chess) {
  const current: Record<string, Record<string, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  chess.board().forEach(row =>
    row.forEach(piece => {
      if (!piece || piece.type === 'k') return;
      current[piece.color][piece.type]++;
    })
  );
  const whiteCaptured: string[] = [];
  const blackCaptured: string[] = [];
  Object.entries(INITIAL_COUNTS).forEach(([type, count]) => {
    const missingB = count - (current.b[type] ?? 0);
    for (let i = 0; i < missingB; i++) whiteCaptured.push(type);
    const missingW = count - (current.w[type] ?? 0);
    for (let i = 0; i < missingW; i++) blackCaptured.push(type);
  });
  const whiteAdv =
    whiteCaptured.reduce((a, p) => a + (PIECE_VALUES[p] ?? 0), 0) -
    blackCaptured.reduce((a, p) => a + (PIECE_VALUES[p] ?? 0), 0);
  return { whiteCaptured, blackCaptured, whiteAdv };
}

export default function Game() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const sp = new URLSearchParams(search);
  const initialMode  = (sp.get('mode')  as GameMode)      || 'ai';
  const initialDiff  = (sp.get('diff')  as AIDifficulty)  || 'medium';
  const initialDiff2 = (sp.get('diff2') as AIDifficulty)  || 'medium';
  const initialSpeed = parseInt(sp.get('speed') || '700', 10);
  const initialTime  = parseInt(sp.get('time')  || '0',   10);

  const [moveSpeed, setMoveSpeed] = useState(initialSpeed);

  const {
    chess, fen, history, lastMove, gameStatus, openingName,
    makeMove, resetGame, undoMove, isThinking,
    isPaused, setIsPaused,
    mode, playerColor,
  } = useChessGame({
    initialMode,
    difficulty:  initialDiff,
    difficulty2: initialDiff2,
    moveDelay:   moveSpeed,
  });

  const isAiVsAi = mode === 'aivai';
  const [flipped, setFlipped]         = useState(initialMode === 'ai' && playerColor === 'b');
  const [gameOver, setGameOver]       = useState(false);
  const [gameResult, setGameResult]   = useState('');
  const [showResign, setShowResign]   = useState(false);
  const [endSounded, setEndSounded]   = useState(false);
  const [autoFlip, setAutoFlip]       = useState(isAiVsAi);

  const gameIsOver = chess.isGameOver() || gameOver;

  const { whiteTime, blackTime, expired, formatTime, resetClock, hasClocks } = useGameClock(
    initialTime,
    chess.turn(),
    gameIsOver
  );

  // Clock expiry
  useEffect(() => {
    if (expired && !gameOver) {
      setGameOver(true);
      setGameResult(expired === 'w' ? "Time's up — Black wins!" : "Time's up — White wins!");
    }
  }, [expired]);

  // Checkmate / draw detection
  useEffect(() => {
    if (chess.isGameOver() && !gameOver) {
      setGameOver(true);
      if (chess.isCheckmate()) {
        setGameResult(`Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`);
      } else if (chess.isStalemate()) {
        setGameResult('Stalemate — it\'s a draw!');
      } else if (chess.isDraw()) {
        setGameResult('Draw!');
      }
    } else if (!chess.isGameOver() && gameOver && gameResult === '') {
      setGameOver(false);
    }
  }, [fen]);

  // Sound on game end
  useEffect(() => {
    if (gameOver && !endSounded) {
      playGameEndSound();
      setEndSounded(true);
    }
  }, [gameOver]);

  const { whiteCaptured, blackCaptured, whiteAdv } = useMemo(
    () => getCapturedPieces(chess),
    [fen]
  );

  // Auto-flip board in AI vs AI mode after each move
  useEffect(() => {
    if (isAiVsAi && autoFlip && history.length > 0) {
      setFlipped(chess.turn() === 'b');
    }
  }, [history.length]);

  const isPlayerTurn = isAiVsAi ? false : (mode === 'local' || chess.turn() === playerColor);

  const whiteName = isAiVsAi
    ? `AI · ${DIFF_LABEL[initialDiff]}`
    : mode === 'ai' ? (playerColor === 'w' ? 'You' : 'AI') : 'White';
  const blackName = isAiVsAi
    ? `AI · ${DIFF_LABEL[initialDiff2]}`
    : mode === 'ai' ? (playerColor === 'b' ? 'You' : 'AI') : 'Black';

  const topPlayer = flipped
    ? { color: 'w' as const, name: whiteName, captured: whiteCaptured, adv: Math.max(0, whiteAdv), time: whiteTime, active: chess.turn() === 'w' }
    : { color: 'b' as const, name: blackName, captured: blackCaptured, adv: Math.max(0, -whiteAdv), time: blackTime, active: chess.turn() === 'b' };

  const bottomPlayer = flipped
    ? { color: 'b' as const, name: blackName, captured: blackCaptured, adv: Math.max(0, -whiteAdv), time: blackTime, active: chess.turn() === 'b' }
    : { color: 'w' as const, name: whiteName, captured: whiteCaptured, adv: Math.max(0, whiteAdv), time: whiteTime, active: chess.turn() === 'w' };

  const handleReset = () => {
    resetGame();
    resetClock();
    setGameOver(false);
    setGameResult('');
    setEndSounded(false);
  };

  const speedInfo = SPEED_LABELS[moveSpeed] ?? { label: 'Normal', icon: '⚡' };
  const SPEED_CYCLE = [2000, 700, 250, 60];
  const cycleSpeed = () => {
    const idx = SPEED_CYCLE.indexOf(moveSpeed);
    setMoveSpeed(SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(212,175,55,0.07),transparent_55%)]" />

      <div className="relative z-10 container mx-auto px-4 py-4 flex-1 flex flex-col gap-3 max-w-[1120px]">

        {/* ── Top nav ── */}
        <div className="flex items-center justify-between h-10 shrink-0">
          <Button
            variant="ghost" size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5 px-2"
            onClick={() => setLocation('/')}
          >
            ← Menu
          </Button>

          {/* Centre: spectator badge OR opening name OR AI thinking dots */}
          <div className="flex-1 flex justify-center items-center gap-2 px-4">
            {isAiVsAi && (
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)', color: 'hsl(38 92% 55%)' }}>
                👁 Spectating
              </span>
            )}
            <AnimatePresence mode="wait">
              {isThinking && !isPaused ? (
                <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-primary block"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay }} />
                  ))}
                  <span className="ml-1.5 text-xs tracking-wider">{isAiVsAi ? 'AI playing…' : 'AI thinking'}</span>
                </motion.div>
              ) : openingName ? (
                <motion.p key={openingName} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground font-serif italic tracking-wide truncate text-center">
                  {openingName}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1">
            {/* Spectator controls */}
            {isAiVsAi && (
              <>
                {/* Pause / Resume */}
                <Button variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsPaused(p => !p)} title={isPaused ? 'Resume' : 'Pause'}>
                  {isPaused ? '▶' : '⏸'}
                </Button>
                {/* Speed cycle */}
                <Button variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-foreground"
                  onClick={cycleSpeed} title="Cycle speed">
                  <span className="text-base leading-none">{speedInfo.icon}</span>
                  <span className="text-xs ml-1 hidden sm:inline">{speedInfo.label}</span>
                </Button>
                {/* Auto-flip toggle */}
                <Button variant={autoFlip ? 'outline' : 'ghost'} size="sm"
                  className="px-2 text-muted-foreground hover:text-foreground text-xs hidden sm:flex"
                  onClick={() => setAutoFlip(f => !f)} title="Auto-flip board">
                  ⇄ Auto
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5 px-2"
              onClick={() => setFlipped(f => !f)} title="Flip board">
              <span className="text-base font-bold">⇄</span>
              <span className="hidden sm:inline">Flip</span>
            </Button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-4">

          {/* Board column */}
          <div className="w-full lg:w-auto flex flex-col gap-2">
            <PlayerCard
              color={topPlayer.color}
              name={topPlayer.name}
              timeLeft={hasClocks ? topPlayer.time : undefined}
              capturedPieces={topPlayer.captured}
              materialAdvantage={topPlayer.adv}
              isActive={topPlayer.active && !gameIsOver}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="w-full lg:w-[520px] xl:w-[560px]"
            >
              <Board3D
                chess={chess}
                onMove={makeMove}
                disabled={!isPlayerTurn || gameIsOver}
                flipped={flipped}
                lastMove={lastMove ? { from: lastMove.from, to: lastMove.to } : null}
                statusText={gameStatus}
              />

              {/* Spectator overlay when paused */}
              {isAiVsAi && isPaused && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl z-30"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                >
                  <button
                    onClick={() => setIsPaused(false)}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <span className="text-5xl">▶</span>
                    <span className="text-sm text-white/70 tracking-widest uppercase">Resume</span>
                  </button>
                </motion.div>
              )}
            </motion.div>

            <PlayerCard
              color={bottomPlayer.color}
              name={bottomPlayer.name}
              timeLeft={hasClocks ? bottomPlayer.time : undefined}
              capturedPieces={bottomPlayer.captured}
              materialAdvantage={bottomPlayer.adv}
              isActive={bottomPlayer.active && !gameIsOver}
            />

            {/* Game controls — hidden in AI vs AI */}
            {!isAiVsAi && (
            <div className="flex gap-2 mt-1">
              <Button variant="outline" size="sm" className="flex-1 text-sm"
                onClick={undoMove} disabled={history.length === 0 || (mode === 'ai' && isThinking) || gameIsOver}>
                ↩ Undo
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 text-sm"
                onClick={() => setShowResign(true)} disabled={gameIsOver || history.length === 0}>
                🏳 Resign
              </Button>
            </div>
            )}
          </div>

          {/* Right panel: eval bar + move history */}
          <div className="w-full lg:w-[240px] xl:w-[270px] flex gap-3 lg:self-stretch lg:min-h-[520px]">
            <EvalBar chess={chess} flipped={flipped} className="shrink-0 lg:self-stretch" />
            <div className="flex-1 min-h-[220px] lg:min-h-0">
              <MoveHistory history={history} currentMoveIndex={history.length - 1} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Game Over dialog ── */}
      <Dialog open={gameOver} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif tracking-wide">Game Over</DialogTitle>
            <DialogDescription className="text-base mt-1">{gameResult}</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground py-1">
            {history.length} move{history.length !== 1 ? 's' : ''} played
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start mt-2">
            <Button onClick={handleReset}>Play Again</Button>
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.setItem('lastGamePgn', chess.pgn());
                setLocation('/analysis');
              }}
            >
              Analyze Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Resign confirmation ── */}
      <Dialog open={showResign} onOpenChange={setShowResign}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Resign the game?</DialogTitle>
            <DialogDescription>Your opponent will be declared the winner.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-start mt-2">
            <Button
              variant="destructive"
              onClick={() => {
                setShowResign(false);
                setGameOver(true);
                const winner = mode === 'ai'
                  ? (playerColor === 'w' ? 'AI wins.' : 'You win!')
                  : chess.turn() === 'w' ? 'Black wins.' : 'White wins.';
                setGameResult(`Resigned — ${winner}`);
              }}
            >
              Yes, Resign
            </Button>
            <Button variant="outline" onClick={() => setShowResign(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
