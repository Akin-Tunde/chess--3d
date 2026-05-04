import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AIDifficulty } from '@/lib/chess-ai';

type TimeOption = { label: string; sublabel: string; seconds: number };

const TIME_OPTIONS: TimeOption[] = [
  { label: '∞', sublabel: 'No clock', seconds: 0 },
  { label: '1', sublabel: 'Bullet', seconds: 60 },
  { label: '3', sublabel: 'Blitz', seconds: 180 },
  { label: '5', sublabel: 'Blitz', seconds: 300 },
  { label: '10', sublabel: 'Rapid', seconds: 600 },
];

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   desc: 'Random moves', icon: '🌱' },
  medium: { label: 'Medium', desc: 'Tactical play', icon: '⚔️' },
  hard:   { label: 'Hard',   desc: 'Deep analysis', icon: '🏆' },
} as const;

export default function Home() {
  const [, setLocation] = useLocation();
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [timeControl, setTimeControl] = useState<number>(0);

  const startAI = () => {
    const params = new URLSearchParams({ mode: 'ai', diff: difficulty });
    if (timeControl > 0) params.set('time', String(timeControl));
    setLocation(`/game?${params}`);
  };

  const startLocal = () => {
    const params = new URLSearchParams({ mode: 'local' });
    if (timeControl > 0) params.set('time', String(timeControl));
    setLocation(`/game?${params}`);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px] px-5 py-8"
      >
        {/* Hero */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.55, type: 'spring', stiffness: 200 }}
            className="text-[88px] leading-none mb-4 text-primary"
            style={{ filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.35))' }}
          >
            ♞
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-2 tracking-tight"
          >
            Chess Arena
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-muted-foreground text-xs tracking-[0.4em] uppercase"
          >
            The Midnight Tournament
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-card/60 backdrop-blur-md border-border/60 shadow-2xl">
            <CardContent className="p-6 flex flex-col gap-6">

              {/* Difficulty */}
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">AI Difficulty</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(DIFFICULTY_CONFIG) as [AIDifficulty, typeof DIFFICULTY_CONFIG[AIDifficulty]][]).map(([level, cfg]) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                        difficulty === level
                          ? 'bg-primary/20 border-primary text-primary shadow-[0_0_0_1px_rgba(212,175,55,0.3)]'
                          : 'bg-secondary/40 border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-secondary/70'
                      }`}
                    >
                      <span className="text-lg leading-none">{cfg.icon}</span>
                      <span>{cfg.label}</span>
                      <span className="text-[10px] opacity-70">{cfg.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time control */}
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Time Control</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {TIME_OPTIONS.map(({ label, sublabel, seconds }) => (
                    <button
                      key={seconds}
                      onClick={() => setTimeControl(seconds)}
                      className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-lg border text-center transition-all duration-200 cursor-pointer ${
                        timeControl === seconds
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-secondary/40 border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-secondary/70'
                      }`}
                    >
                      <span className="text-sm font-bold leading-none">{label}</span>
                      <span className="text-[9px] opacity-70 leading-tight">{sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start AI button */}
              <Button className="w-full h-12 text-base font-semibold shadow-lg tracking-wide" onClick={startAI}>
                Play vs AI
              </Button>

              {/* Divider */}
              <div className="relative -my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-widest">or</span>
                </div>
              </div>

              {/* Local play */}
              <Button
                variant="secondary"
                className="w-full h-11 text-sm"
                onClick={startLocal}
              >
                Pass & Play (2 Players)
              </Button>

            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
