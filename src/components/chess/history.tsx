import React from 'react';
import { Move } from 'chess.js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface HistoryProps {
  history: Move[];
  currentMoveIndex?: number;
  onMoveClick?: (index: number) => void;
}

export function MoveHistory({ history, currentMoveIndex = -1, onMoveClick }: HistoryProps) {
  // Group moves into pairs (White, Black)
  const movePairs: { white?: Move; black?: Move; index: number }[] = [];
  
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      white: history[i],
      black: history[i + 1],
      index: Math.floor(i / 2) + 1,
    });
  }

  return (
    <div className="w-full h-full flex flex-col bg-card border border-border rounded-md overflow-hidden">
      <div className="p-3 bg-secondary border-b border-border">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Move History</h3>
      </div>
      <ScrollArea className="flex-grow">
        <div className="p-2 space-y-1">
          {movePairs.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground italic">No moves yet</div>
          ) : (
            movePairs.map((pair, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex text-sm">
                <div className="w-8 text-center py-1 text-muted-foreground font-mono">{pair.index}.</div>
                <div 
                  className={`flex-1 py-1 px-2 cursor-pointer rounded ${
                    currentMoveIndex === idx * 2 ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-secondary text-foreground'
                  }`}
                  onClick={() => onMoveClick && onMoveClick(idx * 2)}
                >
                  {pair.white?.san}
                </div>
                <div 
                  className={`flex-1 py-1 px-2 cursor-pointer rounded ${
                    currentMoveIndex === idx * 2 + 1 ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-secondary text-foreground'
                  }`}
                  onClick={() => onMoveClick && pair.black && onMoveClick(idx * 2 + 1)}
                >
                  {pair.black?.san}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
