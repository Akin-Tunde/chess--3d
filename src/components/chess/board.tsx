import React, { useState } from 'react';
import { Chess, Square } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { PromotionDialog } from './promotion-dialog';

const PIECE_UNICODE: Record<string, string> = {
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
};

interface BoardProps {
  chess: Chess;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  flipped?: boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  statusText?: string;
}

export function Board({ chess, onMove, flipped = false, disabled = false, lastMove = null, statusText }: BoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  const squares: { square: Square; piece: ReturnType<typeof chess.get>; isLight: boolean; fileLabel: string; rankLabel: string }[] = [];
  ranks.forEach((rank, rIdx) => {
    files.forEach((file, fIdx) => {
      const square = (file + rank) as Square;
      squares.push({
        square,
        piece: chess.get(square),
        isLight: (rIdx + fIdx) % 2 === 0,
        fileLabel: rIdx === (flipped ? 0 : 7) ? file : '',
        rankLabel: fIdx === (flipped ? 7 : 0) ? String(rank) : '',
      });
    });
  });

  const validMoves = selectedSquare && !disabled
    ? chess.moves({ square: selectedSquare, verbose: true })
    : [];
  const validSquares = validMoves.map(m => m.to as Square);

  const handleSquareClick = (square: Square) => {
    if (disabled) return;

    if (selectedSquare) {
      if (validSquares.includes(square)) {
        const move = validMoves.find(m => m.to === square);
        if (move?.flags?.includes('p')) {
          // Promotion — show picker
          setPendingPromotion({ from: selectedSquare, to: square });
          setSelectedSquare(null);
        } else {
          onMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
        }
      } else {
        const piece = chess.get(square);
        if (piece && piece.color === chess.turn()) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    }
  };

  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      onMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
      setPendingPromotion(null);
    }
  };

  return (
    <>
      <div className="relative w-full aspect-square [perspective:1800px]">
        <motion.div
          initial={{ rotateX: 18, rotateZ: -0.5, y: 10 }}
          animate={{ rotateX: 18, rotateZ: -0.5, y: [10, 0, 10] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-full h-full rounded-2xl overflow-hidden grid grid-cols-8 grid-rows-8 shadow-[0_35px_110px_rgba(0,0,0,0.78),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/10 bg-[#0f0b08] [transform-style:preserve-3d]"
          style={{ transformOrigin: 'center center' }}
        >
          <div className="pointer-events-none absolute inset-x-2 -bottom-5 h-8 rounded-full bg-black/60 blur-2xl z-[0]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,191,0,0.14),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_30%,rgba(0,0,0,0.2))] z-10" />
          <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-20px_40px_rgba(0,0,0,0.45)] z-[11]" />

          {/* Status overlay */}
          <AnimatePresence>
            {statusText && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="pointer-events-none absolute left-3 top-3 z-30 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary backdrop-blur-md"
              >
                {statusText}
              </motion.div>
            )}
          </AnimatePresence>

          {squares.map(({ square, piece, isLight, fileLabel, rankLabel }) => {
            const isSelected = selectedSquare === square;
            const isValidTarget = validSquares.includes(square);
            const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
            const isKingInCheck = piece?.type === 'k' && piece?.color === chess.turn() && chess.inCheck();
            const isHovered = hoveredSquare === square && !disabled;
            const hasEnemyOnTarget = isValidTarget && !!piece;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onMouseEnter={() => setHoveredSquare(square)}
                onMouseLeave={() => setHoveredSquare(null)}
                className={`relative flex items-center justify-center cursor-pointer select-none
                ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
              `}
                style={{ transition: 'background-color 0.1s' }}
              >
                {/* Last move highlight */}
                {isLastMoveSquare && (
                  <div className="absolute inset-0 bg-yellow-400/25 z-[1]" />
                )}

                {/* Selected highlight */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/40 z-[2]" />
                )}

                {/* Check highlight */}
                {isKingInCheck && (
                  <div className="absolute inset-0 bg-destructive/50 z-[2]" />
                )}

                {/* Legal move dot or ring */}
                {isValidTarget && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute z-[3] rounded-full ${
                      hasEnemyOnTarget
                        ? 'inset-0 border-[5px] border-black/25'
                        : 'w-[32%] h-[32%] bg-black/20'
                    }`}
                  />
                )}

                {/* Hover glow for selected piece's valid squares */}
                {isHovered && isValidTarget && (
                  <div className="absolute inset-0 bg-white/10 z-[4]" />
                )}

                {/* Piece */}
                <AnimatePresence>
                  {piece && (
                    <motion.div
                      key={`${piece.color}${piece.type}-${square}`}
                      initial={{ opacity: 0, scale: 0.6, y: -6, rotateX: 38 }}
                      animate={{
                        opacity: 1,
                        scale: isSelected ? 1.08 : isHovered && piece.color === chess.turn() && !disabled ? 1.05 : 1,
                        y: 0,
                        rotateX: 0,
                      }}
                      exit={{ opacity: 0, scale: 0.4, y: 10, rotateX: -18, transition: { duration: 0.15 } }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                      className={`relative z-[5] leading-none select-none pointer-events-none`}
                      style={{
                        fontSize: 'clamp(28px, 6vw, 52px)',
                        textShadow: piece.color === 'w'
                          ? '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.4)'
                          : '0 1px 3px rgba(255,255,255,0.15), 0 0 6px rgba(0,0,0,0.6)',
                        filter: piece.color === 'w'
                          ? 'drop-shadow(0 8px 10px rgba(0,0,0,0.55))'
                          : 'drop-shadow(0 8px 10px rgba(0,0,0,0.75))',
                        color: piece.color === 'w' ? '#ffffff' : '#1a1008',
                      }}
                    >
                      {PIECE_UNICODE[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Coordinates */}
                {fileLabel && (
                  <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold pointer-events-none select-none z-[6] ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {fileLabel}
                  </span>
                )}
                {rankLabel && (
                  <span className={`absolute top-0.5 left-1 text-[9px] font-bold pointer-events-none select-none z-[6] ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {rankLabel}
                  </span>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>

      <PromotionDialog
        open={!!pendingPromotion}
        color={chess.turn()}
        onChoose={handlePromotion}
      />
    </>
  );
}
