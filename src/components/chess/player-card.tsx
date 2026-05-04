import React from 'react';
import { motion } from 'framer-motion';

const PIECE_UNICODE: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕',
};

interface PlayerCardProps {
  color: 'w' | 'b';
  name: string;
  /** remaining seconds, undefined = no clock */
  timeLeft?: number;
  capturedPieces: string[];
  materialAdvantage: number;
  isActive: boolean;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function PlayerCard({
  color,
  name,
  timeLeft,
  capturedPieces,
  materialAdvantage,
  isActive,
}: PlayerCardProps) {
  const isLow = timeLeft !== undefined && timeLeft > 0 && timeLeft < 30;

  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 ${
        isActive
          ? 'bg-secondary/70 border-primary/30 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.15)]'
          : 'bg-secondary/20 border-transparent'
      }`}
    >
      {/* Left: icon + name + captured pieces */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`text-2xl leading-none shrink-0 ${
            color === 'w'
              ? 'text-[#f0d9b5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
              : 'text-[#1a1a1a] drop-shadow-[0_1px_2px_rgba(255,255,255,0.15)]'
          }`}
        >
          {color === 'w' ? '♔' : '♚'}
        </span>

        <div className="min-w-0">
          <div className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {name}
          </div>
          <div className="flex flex-wrap gap-px mt-0.5 min-h-[16px]">
            {capturedPieces.map((p, i) => (
              <span key={i} className="text-sm leading-none opacity-80" style={{ fontSize: '13px' }}>
                {PIECE_UNICODE[color === 'w' ? p : p.toUpperCase()]}
              </span>
            ))}
            {materialAdvantage > 0 && (
              <span className="text-[10px] text-muted-foreground self-center ml-0.5">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: clock */}
      {timeLeft !== undefined && (
        <motion.div
          animate={
            isLow && isActive
              ? { opacity: [1, 0.35, 1] }
              : { opacity: 1 }
          }
          transition={
            isLow && isActive
              ? { repeat: Infinity, duration: 0.9 }
              : {}
          }
          className={`font-mono text-xl font-bold tabular-nums px-3 py-1.5 rounded-lg shrink-0 ml-3 ${
            timeLeft === 0
              ? 'text-destructive bg-destructive/10 border border-destructive/30'
              : isLow
              ? 'text-destructive bg-destructive/10 border border-destructive/20'
              : isActive
              ? 'text-primary bg-primary/10 border border-primary/20'
              : 'text-muted-foreground bg-secondary/40 border border-border/50'
          }`}
        >
          {formatTime(timeLeft)}
        </motion.div>
      )}
    </div>
  );
}
