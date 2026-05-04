import React from 'react';
import { Chess } from 'chess.js';

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

function getMaterialScore(chess: Chess): number {
  let score = 0;
  chess.board().forEach(row => {
    row.forEach(piece => {
      if (!piece || piece.type === 'k') return;
      const val = PIECE_VALUES[piece.type] ?? 0;
      score += piece.color === 'w' ? val : -val;
    });
  });
  return score;
}

interface EvalBarProps {
  chess: Chess;
  flipped?: boolean;
  className?: string;
}

export function EvalBar({ chess, flipped = false, className = '' }: EvalBarProps) {
  const score = getMaterialScore(chess);
  const clamped = Math.max(-15, Math.min(15, score));
  // 50% = equal, >50% = white winning (bar fills from bottom = white's side)
  const whitePercent = ((clamped + 15) / 30) * 100;

  // Always: dark fills from the top (black's territory), regardless of board flip
  const topPercent = 100 - whitePercent;

  return (
    <div className={`flex flex-col items-center gap-1.5 select-none ${className}`}>
      {/* Score label - black side */}
      <div className="text-[10px] font-mono text-muted-foreground h-4 flex items-center">
        {score < 0 ? `+${Math.abs(score)}` : ''}
      </div>

      {/* Bar */}
      <div className="flex-1 w-4 relative rounded-full overflow-hidden bg-[#d4c5a0] border border-white/10 shadow-inner min-h-[260px]">
        {/* Dark fill from top */}
        <div
          className="absolute inset-x-0 top-0 bg-[#1c1c1c] transition-all duration-700 ease-in-out rounded-b-sm"
          style={{ height: `${topPercent}%` }}
        />
        {/* Separator line */}
        <div
          className="absolute inset-x-0 h-px bg-white/30 transition-all duration-700"
          style={{ top: `${topPercent}%` }}
        />
      </div>

      {/* Score label - white side */}
      <div className="text-[10px] font-mono text-muted-foreground h-4 flex items-center">
        {score > 0 ? `+${score}` : score === 0 ? '=' : ''}
      </div>
    </div>
  );
}
