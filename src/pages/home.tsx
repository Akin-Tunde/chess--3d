import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AIDifficulty } from '@/lib/chess-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeOption = { label: string; sublabel: string; seconds: number };
type GameMode = 'ai' | 'local' | 'aivai';

type SpeedOption = { label: string; icon: string; ms: number };

const SPEED_OPTIONS: SpeedOption[] = [
  { label: 'Slow',    icon: '🐢', ms: 2000 },
  { label: 'Normal',  icon: '⚡', ms: 700  },
  { label: 'Fast',    icon: '🔥', ms: 250  },
  { label: 'Blitz',   icon: '💨', ms: 60   },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_OPTIONS: TimeOption[] = [
  { label: '∞',  sublabel: 'Unlimited', seconds: 0 },
  { label: '1',  sublabel: 'Bullet',    seconds: 60 },
  { label: '3',  sublabel: 'Blitz',     seconds: 180 },
  { label: '5',  sublabel: 'Blitz',     seconds: 300 },
  { label: '10', sublabel: 'Rapid',     seconds: 600 },
];

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Beginner', desc: 'Random play',    icon: '♟', level: 1, color: '#4ade80' },
  medium: { label: 'Tactician', desc: 'Tactical aware', icon: '♞', level: 2, color: '#facc15' },
  hard:   { label: 'Master',   desc: 'Deep analysis',  icon: '♛', level: 3, color: '#f87171' },
} as const;

// Floating piece data — position & animation params
const FLOATING_PIECES = [
  { piece: '♜', x: 6,  y: 12, size: 52, delay: 0,    dur: 7.2, opacity: 0.055 },
  { piece: '♞', x: 88, y: 18, size: 40, delay: 1.1,  dur: 8.5, opacity: 0.060 },
  { piece: '♝', x: 15, y: 72, size: 34, delay: 2.3,  dur: 6.8, opacity: 0.045 },
  { piece: '♛', x: 78, y: 65, size: 58, delay: 0.7,  dur: 9.1, opacity: 0.050 },
  { piece: '♟', x: 50, y: 85, size: 30, delay: 1.8,  dur: 7.6, opacity: 0.040 },
  { piece: '♚', x: 92, y: 42, size: 44, delay: 3.1,  dur: 8.0, opacity: 0.048 },
  { piece: '♙', x: 3,  y: 48, size: 28, delay: 2.6,  dur: 6.4, opacity: 0.038 },
  { piece: '♖', x: 62, y: 5,  size: 36, delay: 0.4,  dur: 7.9, opacity: 0.042 },
];

// Mini decorative chessboard pattern
const BOARD_SQUARES = Array.from({ length: 64 }, (_, i) => ({
  isLight: ((Math.floor(i / 8) + (i % 8)) % 2) === 0,
}));

// ─── Sub-components ──────────────────────────────────────────────────────────

function FloatingPiece({
  piece, x, y, size, delay, dur, opacity,
}: (typeof FLOATING_PIECES)[0]) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="absolute pointer-events-none select-none font-serif"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: size, opacity, userSelect: 'none' }}
      animate={reduced ? {} : {
        y: [0, -18, 0],
        rotate: [-4, 4, -4],
      }}
      transition={{
        duration: dur,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {piece}
    </motion.div>
  );
}

function MiniBoard() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.025 }}
    >
      <div
        className="w-full h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
        }}
      >
        {BOARD_SQUARES.map((sq, i) => (
          <div
            key={i}
            style={{ background: sq.isLight ? '#f0d9b5' : '#b58863' }}
          />
        ))}
      </div>
    </div>
  );
}

function DifficultyBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 mt-0.5">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-1 w-4 rounded-full transition-all duration-300"
          style={{ background: n <= level ? 'currentColor' : 'rgba(255,255,255,0.12)' }}
        />
      ))}
    </div>
  );
}

// Full difficulty picker (3 columns, used for vs AI)
function DifficultyPicker({ label, selected, onSelect, glowId }: {
  label: string; selected: AIDifficulty;
  onSelect: (d: AIDifficulty) => void; glowId: string;
}) {
  const cfg = DIFFICULTY_CONFIG[selected];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
        <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(DIFFICULTY_CONFIG) as [AIDifficulty, typeof DIFFICULTY_CONFIG[AIDifficulty]][]).map(([level, c]) => {
          const isActive = selected === level;
          return (
            <motion.button key={level} onClick={() => onSelect(level)}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl cursor-pointer"
              style={{
                background: isActive ? `rgba(${hexToRgb(c.color)}, 0.10)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? `rgba(${hexToRgb(c.color)}, 0.35)` : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isActive ? `0 0 20px rgba(${hexToRgb(c.color)}, 0.12)` : 'none',
              }}
            >
              {isActive && <motion.div layoutId={glowId} className="absolute inset-0 rounded-2xl"
                style={{ background: `radial-gradient(circle at 50% 30%, rgba(${hexToRgb(c.color)}, 0.15) 0%, transparent 70%)` }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }} />}
              <span className="relative text-2xl leading-none" style={{ filter: isActive ? `drop-shadow(0 0 8px ${c.color})` : 'none', color: isActive ? c.color : 'rgba(255,255,255,0.4)', transition: 'filter 0.2s, color 0.2s' }}>{c.icon}</span>
              <span className="relative text-xs font-bold" style={{ color: isActive ? c.color : 'rgba(255,255,255,0.55)', transition: 'color 0.2s' }}>{c.label}</span>
              <div style={{ color: isActive ? c.color : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}><DifficultyBar level={c.level} /></div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// Compact difficulty picker (stacked list, used for AI vs AI side-by-side)
function DifficultyPickerCompact({ selected, onSelect, glowId }: {
  selected: AIDifficulty; onSelect: (d: AIDifficulty) => void; glowId: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {(Object.entries(DIFFICULTY_CONFIG) as [AIDifficulty, typeof DIFFICULTY_CONFIG[AIDifficulty]][]).map(([level, c]) => {
        const isActive = selected === level;
        return (
          <motion.button key={level} onClick={() => onSelect(level)}
            whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
            style={{
              background: isActive ? `rgba(${hexToRgb(c.color)}, 0.10)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? `rgba(${hexToRgb(c.color)}, 0.30)` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {isActive && <motion.div layoutId={glowId} className="absolute inset-0 rounded-xl"
              style={{ background: `radial-gradient(ellipse at 0% 50%, rgba(${hexToRgb(c.color)}, 0.12) 0%, transparent 80%)` }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }} />}
            <span className="relative text-base leading-none" style={{ color: isActive ? c.color : 'rgba(255,255,255,0.35)', transition: 'color 0.18s' }}>{c.icon}</span>
            <div className="relative flex flex-col">
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? c.color : 'rgba(255,255,255,0.5)', transition: 'color 0.18s' }}>{c.label}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>{c.desc}</span>
            </div>
            {isActive && <span className="relative ml-auto text-xs" style={{ color: c.color }}>✓</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

const TAB_DEFS: { id: GameMode; icon: string; label: string }[] = [
  { id: 'ai',    icon: '🤖', label: 'vs Computer' },
  { id: 'aivai', icon: '⚔️', label: 'AI vs AI'    },
  { id: 'local', icon: '🫂', label: 'Pass & Play' },
];

function TabBar({
  active,
  onChange,
}: {
  active: GameMode;
  onChange: (m: GameMode) => void;
}) {
  return (
    <div className="relative flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {TAB_DEFS.map(({ id, icon, label }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative flex-1 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors duration-200 cursor-pointer z-10"
            style={{ color: isActive ? 'hsl(38 92% 50%)' : 'rgba(255,255,255,0.4)', fontSize: 12 }}
          >
            {isActive && (
              <motion.div
                layoutId="tab-bg"
                className="absolute inset-0 rounded-lg"
                style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.22)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center gap-0.5">
              <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [, setLocation] = useLocation();
  const [difficulty,  setDifficulty]  = useState<AIDifficulty>('medium');
  const [difficulty2, setDifficulty2] = useState<AIDifficulty>('medium');
  const [speed, setSpeed]             = useState<number>(700);
  const [timeControl, setTimeControl] = useState<number>(0);
  const [mode, setMode]               = useState<GameMode>('ai');
  const [hoverBtn, setHoverBtn]       = useState(false);

  const startGame = () => {
    const params = new URLSearchParams({ mode });
    if (mode === 'ai')    { params.set('diff', difficulty); }
    if (mode === 'aivai') { params.set('diff', difficulty); params.set('diff2', difficulty2); params.set('speed', String(speed)); }
    if (timeControl > 0 && mode !== 'aivai') params.set('time', String(timeControl));
    setLocation(`/game?${params}`);
  };

  const cfg  = DIFFICULTY_CONFIG[difficulty];
  const cfg2 = DIFFICULTY_CONFIG[difficulty2];

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">

      {/* ── Layered background ── */}
      {/* Chess board texture layer */}
      <MiniBoard />

      {/* Ambient gradient orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10%', left: '-15%',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(10px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%', right: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(10px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '60vw', height: '40vw',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.03) 0%, transparent 65%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Floating chess pieces */}
      {FLOATING_PIECES.map((p, i) => (
        <FloatingPiece key={i} {...p} />
      ))}

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Main content ── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[440px] mx-auto px-4 py-10"
      >

        {/* ── Hero ── */}
        <div className="text-center mb-10">
          {/* Crown emblem */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.65, type: 'spring', stiffness: 180, damping: 14 }}
            className="relative inline-block mb-5"
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div
              className="relative flex items-center justify-center rounded-2xl"
              style={{
                width: 88, height: 88,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.04) 100%)',
                border: '1px solid rgba(212,175,55,0.25)',
                boxShadow: '0 0 40px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ fontSize: 52, lineHeight: 1, filter: 'drop-shadow(0 2px 12px rgba(212,175,55,0.5))' }}>
                ♞
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.55 }}
            className="font-serif font-bold tracking-tight mb-1.5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 3.2rem)', letterSpacing: '-0.02em', color: 'hsl(45 20% 92%)' }}
          >
            Chess{' '}
            <span style={{
              background: 'linear-gradient(90deg, hsl(38 92% 50%), hsl(45 90% 65%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Arena
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.38em', textTransform: 'uppercase', fontWeight: 500 }}
          >
            The Midnight Tournament
          </motion.p>
        </div>

        {/* ── Glass card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: 'rgba(255,255,255,0.032)',
            border: '1px solid rgba(255,255,255,0.075)',
            borderRadius: 20,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
            overflow: 'hidden',
          }}
        >
          {/* Gold top line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.7) 40%, rgba(212,175,55,0.7) 60%, transparent 100%)' }} />

          <div className="p-6 flex flex-col gap-6">

            {/* ── Game mode tabs ── */}
            <TabBar active={mode} onChange={setMode} />

            <AnimatePresence mode="wait">

              {/* ── vs Computer ── */}
              {mode === 'ai' && (
                <motion.div key="ai-settings" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
                  <DifficultyPicker label="Difficulty" selected={difficulty} onSelect={setDifficulty} glowId="diff-glow-ai" />
                </motion.div>
              )}

              {/* ── AI vs AI ── */}
              {mode === 'aivai' && (
                <motion.div key="aivai-settings" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
                  <div className="flex flex-col gap-5">
                    {/* Two side-by-side difficulty pickers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 16 }}>♔</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>White AI</span>
                        </div>
                        <DifficultyPickerCompact selected={difficulty}  onSelect={setDifficulty}  glowId="diff-w" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 16 }}>♚</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Black AI</span>
                        </div>
                        <DifficultyPickerCompact selected={difficulty2} onSelect={setDifficulty2} glowId="diff-b" />
                      </div>
                    </div>

                    {/* Speed control */}
                    <div className="flex flex-col gap-2">
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Move Speed</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {SPEED_OPTIONS.map((opt) => {
                          const isActive = speed === opt.ms;
                          return (
                            <motion.button
                              key={opt.ms}
                              onClick={() => setSpeed(opt.ms)}
                              whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                              className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl cursor-pointer"
                              style={{
                                background: isActive ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isActive ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}`,
                                transition: 'all 0.18s ease',
                              }}
                            >
                              <span style={{ fontSize: 16, lineHeight: 1 }}>{opt.icon}</span>
                              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: isActive ? 'hsl(38 92% 50%)' : 'rgba(255,255,255,0.4)', transition: 'color 0.18s' }}>{opt.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* ── Time control ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                  Time Control
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  {timeControl === 0 ? 'No limit' : TIME_OPTIONS.find(t => t.seconds === timeControl)?.sublabel}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {TIME_OPTIONS.map(({ label, sublabel, seconds }) => {
                  const isActive = timeControl === seconds;
                  return (
                    <motion.button
                      key={seconds}
                      onClick={() => setTimeControl(seconds)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="relative flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl cursor-pointer"
                      style={{
                        background: isActive ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <span
                        className="font-bold leading-none"
                        style={{ fontSize: 16, color: isActive ? 'hsl(38 92% 50%)' : 'rgba(255,255,255,0.55)', transition: 'color 0.18s' }}
                      >
                        {label}
                      </span>
                      <span
                        style={{ fontSize: 9, color: isActive ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', transition: 'color 0.18s' }}
                      >
                        {sublabel}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── CTA Button ── */}
            <motion.button
              onClick={startGame}
              onHoverStart={() => setHoverBtn(true)}
              onHoverEnd={() => setHoverBtn(false)}
              whileHover={{ scale: 1.018 }}
              whileTap={{ scale: 0.982 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="relative w-full flex items-center justify-center gap-2.5 rounded-2xl font-bold cursor-pointer overflow-hidden"
              style={{
                height: 52,
                fontSize: 15,
                letterSpacing: '0.05em',
                color: '#0c0a05',
                background: 'linear-gradient(135deg, hsl(38 92% 52%) 0%, hsl(42 95% 60%) 50%, hsl(38 92% 52%) 100%)',
                boxShadow: hoverBtn
                  ? '0 8px 32px rgba(212,175,55,0.45), 0 0 0 1px rgba(212,175,55,0.4)'
                  : '0 4px 20px rgba(212,175,55,0.25)',
                transition: 'box-shadow 0.3s ease',
              }}
            >
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
              />
              <span className="relative font-serif text-xl leading-none" style={{ marginTop: -1 }}>
                {mode === 'aivai' ? '⚔️' : mode === 'ai' ? '♟' : '♞'}
              </span>
              <span className="relative">
                {mode === 'ai'    && `Play vs ${cfg.label}`}
                {mode === 'aivai' && `Watch: ${cfg.label} vs ${cfg2.label}`}
                {mode === 'local' && 'Start Local Game'}
              </span>
            </motion.button>

          </div>

          {/* Bottom stats strip */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: '10px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {[
              { label: 'Openings', value: '100+' },
              { label: 'Difficulty levels', value: '3' },
              { label: 'Time controls', value: '5' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(212,175,55,0.75)' }}>{stat.value}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-center mt-6"
          style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.14)' }}
        >
          Chess Arena · The Midnight Tournament
        </motion.p>
      </motion.div>
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Convert a 6-char hex color to "r, g, b" string for use in rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
