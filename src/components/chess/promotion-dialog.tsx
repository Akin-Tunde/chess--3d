import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PIECES = {
  w: [
    { key: 'q', sym: '♕', label: 'Queen' },
    { key: 'r', sym: '♖', label: 'Rook' },
    { key: 'b', sym: '♗', label: 'Bishop' },
    { key: 'n', sym: '♘', label: 'Knight' },
  ],
  b: [
    { key: 'q', sym: '♛', label: 'Queen' },
    { key: 'r', sym: '♜', label: 'Rook' },
    { key: 'b', sym: '♝', label: 'Bishop' },
    { key: 'n', sym: '♞', label: 'Knight' },
  ],
} as const;

interface PromotionDialogProps {
  open: boolean;
  color: 'w' | 'b';
  onChoose: (piece: 'q' | 'r' | 'b' | 'n') => void;
}

export function PromotionDialog({ open, color, onChoose }: PromotionDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-card border border-border/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-5"
          >
            <div>
              <h3 className="text-foreground font-serif text-lg tracking-wide text-center">Promote Pawn</h3>
              <p className="text-muted-foreground text-xs text-center mt-1">Choose a piece</p>
            </div>
            <div className="flex gap-3">
              {PIECES[color].map(({ key, sym, label }) => (
                <motion.button
                  key={key}
                  onClick={() => onChoose(key)}
                  whileHover={{ scale: 1.12, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-16 h-16 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors duration-150 flex flex-col items-center justify-center gap-0.5 border border-border hover:border-primary cursor-pointer group"
                >
                  <span className="text-3xl leading-none">{sym}</span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground group-hover:text-primary-foreground">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
