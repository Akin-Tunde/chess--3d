import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Chess } from 'chess.js';
import { Button } from '@/components/ui/button';
import { Board } from '@/components/chess/board';
import { MoveHistory } from '@/components/chess/history';
import { CapturedPieces } from '@/components/chess/captured';
import { motion } from 'framer-motion';

export default function Analysis() {
  const [, setLocation] = useLocation();
  const [chess] = useState(new Chess());
  const [fullPgn, setFullPgn] = useState('');
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  
  // Need a separate internal chess instance just to get all moves
  const [historyMoves, setHistoryMoves] = useState<any[]>([]);

  useEffect(() => {
    const pgn = localStorage.getItem('lastGamePgn');
    if (pgn) {
      setFullPgn(pgn);
      const tempChess = new Chess();
      tempChess.loadPgn(pgn);
      const moves = tempChess.history({ verbose: true });
      setHistoryMoves(moves);
      
      // Load current state based on index
      chess.loadPgn(pgn);
      setCurrentMoveIndex(moves.length - 1);
    }
  }, []);

  useEffect(() => {
    if (historyMoves.length > 0) {
      chess.reset();
      for (let i = 0; i <= currentMoveIndex; i++) {
        chess.move(historyMoves[i]);
      }
      // Force re-render of board by shallow copying state? No, Board uses chess.board()
    }
  }, [currentMoveIndex, historyMoves, chess]);

  const goToPrev = () => setCurrentMoveIndex(i => Math.max(-1, i - 1));
  const goToNext = () => setCurrentMoveIndex(i => Math.min(historyMoves.length - 1, i + 1));
  const goToStart = () => setCurrentMoveIndex(-1);
  const goToEnd = () => setCurrentMoveIndex(historyMoves.length - 1);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background relative overflow-hidden">
      <div className="container mx-auto p-4 flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 py-8 lg:py-16">
        
        <div className="w-full max-w-[600px] flex flex-col gap-4">
          <div className="flex justify-between items-center px-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
              ← Back to Menu
            </Button>
            <div className="text-sm font-mono text-primary flex items-center h-8 uppercase tracking-widest">
              Analysis Mode
            </div>
            <Button variant="outline" size="sm" onClick={() => setFlipped(!flipped)}>
              Flip Board
            </Button>
          </div>
          
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
            <Board 
              chess={chess} 
              onMove={() => false} 
              disabled={true}
              flipped={flipped}
            />
          </motion.div>

          <div className="flex justify-center gap-2 mt-4 bg-card p-2 rounded-md border border-border">
             <Button variant="secondary" onClick={goToStart} disabled={currentMoveIndex === -1}>|◀</Button>
             <Button variant="secondary" onClick={goToPrev} disabled={currentMoveIndex === -1}>◀</Button>
             <Button variant="secondary" onClick={goToNext} disabled={currentMoveIndex === historyMoves.length - 1}>▶</Button>
             <Button variant="secondary" onClick={goToEnd} disabled={currentMoveIndex === historyMoves.length - 1}>▶|</Button>
          </div>
        </div>

        <div className="w-full max-w-[400px] flex flex-col gap-6 lg:h-[600px]">
          <CapturedPieces chess={chess} />
          <div className="flex-1 min-h-[300px] lg:min-h-0">
             <MoveHistory 
               history={historyMoves} 
               currentMoveIndex={currentMoveIndex} 
               onMoveClick={setCurrentMoveIndex}
             />
          </div>
        </div>

      </div>
    </div>
  );
}
