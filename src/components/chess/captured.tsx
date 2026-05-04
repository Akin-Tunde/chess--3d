import React from 'react';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';

interface CapturedProps {
  chess: Chess;
}

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

const PIECE_UNICODE: Record<string, string> = {
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛',
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕'
};

export function CapturedPieces({ chess }: CapturedProps) {
  const history = chess.history({ verbose: true });
  const capturedByWhite: string[] = [];
  const capturedByBlack: string[] = [];

  let whiteScore = 0;
  let blackScore = 0;

  // Re-evaluate the board to get exact captured counts based on initial minus current
  const initialCounts: Record<string, number> = {
    'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1,
    'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1
  };
  
  const currentCounts: Record<string, number> = {
    'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0,
    'P': 0, 'N': 0, 'B': 0, 'R': 0, 'Q': 0
  };

  const board = chess.board();
  board.forEach(row => {
    row.forEach(piece => {
      if (piece) {
        const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        currentCounts[key]++;
      }
    });
  });

  ['p', 'n', 'b', 'r', 'q'].forEach(type => {
    const blackCount = initialCounts[type] - currentCounts[type];
    for (let i = 0; i < blackCount; i++) capturedByWhite.push(type);
    whiteScore += blackCount * PIECE_VALUES[type];

    const whiteType = type.toUpperCase();
    const whiteCount = initialCounts[whiteType] - currentCounts[whiteType];
    for (let i = 0; i < whiteCount; i++) capturedByBlack.push(whiteType);
    blackScore += whiteCount * PIECE_VALUES[type];
  });

  const whiteAdvantage = whiteScore - blackScore;
  const blackAdvantage = blackScore - whiteScore;

  return (
    <div className="flex flex-col gap-2 w-full text-lg">
      <div className="flex items-center min-h-[32px] px-2 bg-secondary rounded-sm">
        <div className="flex flex-wrap gap-1 text-white drop-shadow-md">
          {capturedByBlack.map((p, i) => (
            <motion.span key={i} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}>{PIECE_UNICODE[p]}</motion.span>
          ))}
        </div>
        {blackAdvantage > 0 && <span className="ml-2 text-sm text-muted-foreground font-mono">+{blackAdvantage}</span>}
      </div>
      
      <div className="flex items-center min-h-[32px] px-2 bg-secondary rounded-sm">
        <div className="flex flex-wrap gap-1 text-black drop-shadow-sm">
          {capturedByWhite.map((p, i) => (
            <motion.span key={i} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}>{PIECE_UNICODE[p]}</motion.span>
          ))}
        </div>
        {whiteAdvantage > 0 && <span className="ml-2 text-sm text-muted-foreground font-mono">+{whiteAdvantage}</span>}
      </div>
    </div>
  );
}
