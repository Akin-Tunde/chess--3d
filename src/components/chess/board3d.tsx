import React, { useRef, useState, useMemo, useCallback, useEffect, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Chess, Square } from 'chess.js';
import { PromotionDialog } from './promotion-dialog';
import { Board } from './board';

// ─────────────────────────────────────────────────────────────────────────────
// WebGL error boundary — falls back to 2D board if WebGL is unavailable
// ─────────────────────────────────────────────────────────────────────────────

interface EBProps { children: React.ReactNode; fallback: React.ReactNode }
interface EBState { error: boolean }

class WebGLBoundary extends Component<EBProps, EBState> {
  state: EBState = { error: false };
  static getDerivedStateFromError(): EBState { return { error: true }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Piece appearance constants
// ─────────────────────────────────────────────────────────────────────────────

const PIECE_UNICODE: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
};

const PIECE_H: Record<string, number> = {
  p: 0.34, n: 0.48, b: 0.54, r: 0.42, q: 0.68, k: 0.78,
};

const PIECE_R: Record<string, [number, number]> = {
  p: [0.17, 0.13], n: [0.19, 0.12], b: [0.17, 0.09],
  r: [0.21, 0.21], q: [0.19, 0.13], k: [0.20, 0.13],
};

// ─────────────────────────────────────────────────────────────────────────────
// Piece sprite texture cache
// ─────────────────────────────────────────────────────────────────────────────

const _texCache = new Map<string, THREE.CanvasTexture>();

function getPieceTexture(symbol: string, isWhite: boolean): THREE.CanvasTexture {
  const key = `${symbol}-${isWhite}`;
  if (_texCache.has(key)) return _texCache.get(key)!;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  ctx.shadowBlur = isWhite ? 20 : 12;
  ctx.shadowColor = isWhite ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.20)';
  ctx.shadowOffsetY = isWhite ? 5 : 2;
  ctx.font = `${Math.round(S * 0.74)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isWhite ? '#ffffff' : '#110900';
  ctx.fillText(symbol, S / 2, S / 2 + 6);
  const t = new THREE.CanvasTexture(cv);
  _texCache.set(key, t);
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate helpers
// ─────────────────────────────────────────────────────────────────────────────

function squareToXZ(sq: Square, flipped: boolean): [number, number] {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const x = (flipped ? 7 - file : file) - 3.5;
  const z = (flipped ? rank : 7 - rank) - 3.5;
  return [x, z];
}

function xzToSquare(x: number, z: number, flipped: boolean): Square {
  const file = Math.max(0, Math.min(7, Math.round((flipped ? 3.5 - x : x + 3.5))));
  const rank = Math.max(0, Math.min(7, Math.round((flipped ? z + 3.5 : 3.5 - z))));
  return (String.fromCharCode(97 + file) + (rank + 1)) as Square;
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera rig — repositions camera when board is flipped
// ─────────────────────────────────────────────────────────────────────────────

function CameraRig({ flipped }: { flipped: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 11, flipped ? -8.5 : 8.5);
    (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
  }, [flipped, camera]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single 3-D piece
// ─────────────────────────────────────────────────────────────────────────────

interface Piece3DProps {
  pieceType: string;
  pieceColor: 'w' | 'b';
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  isDisabled: boolean;
  isDragging: boolean;
  onClick: () => void;
  onHover: (on: boolean) => void;
  onDragStart: () => void;
  onDragEnd: (position: THREE.Vector3) => void;
}

function Piece3D({
  pieceType, pieceColor, position,
  isSelected, isHovered, isDisabled, isDragging,
  onClick, onHover, onDragStart, onDragEnd,
}: Piece3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragPoint = useRef(new THREE.Vector3());
  const dragging = useRef(false);

  const h  = PIECE_H[pieceType] ?? 0.40;
  const [br, tr] = PIECE_R[pieceType] ?? [0.17, 0.12];
  const isWhite = pieceColor === 'w';

  const matColor    = isWhite ? '#f4ede0' : '#1b1106';
  const metalness   = isWhite ? 0.08 : 0.52;
  const roughness   = isWhite ? 0.58 : 0.22;
  const emissiveCol = isSelected ? '#c89800' : isHovered ? '#705800' : '#000000';
  const emissiveInt = isSelected ? 0.38 : isHovered ? 0.14 : 0;

  const symbolKey = isWhite ? pieceType.toUpperCase() : pieceType;
  const texture = useMemo(
    () => getPieceTexture(PIECE_UNICODE[symbolKey], isWhite),
    [symbolKey, isWhite],
  );

  const baseDiscY = 0.075 + 0.025;
  const bodyY     = 0.075 + 0.05 + h / 2;
  const capY      = 0.075 + 0.05 + h + 0.045;
  const spriteY   = capY + tr * 1.2 + 0.28;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (dragging.current) return;
    const target = isSelected
      ? Math.sin(clock.getElapsedTime() * 3.8) * 0.046 + 0.07
      : 0;
    groupRef.current.position.y += (target - groupRef.current.position.y) * 0.18;
  });

  const mat = (
    <meshStandardMaterial
      color={matColor}
      metalness={metalness}
      roughness={roughness}
      emissive={emissiveCol}
      emissiveIntensity={emissiveInt}
    />
  );

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); if (!isDisabled) onClick(); }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (isDisabled) return;
        dragging.current = true;
        onDragStart();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current || isDisabled) return;
        e.stopPropagation();
        e.ray.intersectPlane(dragPlane.current, dragPoint.current);
        if (groupRef.current) {
          groupRef.current.position.x = dragPoint.current.x;
          groupRef.current.position.z = dragPoint.current.z;
          groupRef.current.position.y = 0.38;
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (!dragging.current) return;
        dragging.current = false;
        if (groupRef.current) onDragEnd(groupRef.current.position.clone());
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        onHover(true);
        document.body.style.cursor = isDisabled ? 'default' : (isDragging ? 'grabbing' : 'pointer');
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        onHover(false);
        document.body.style.cursor = 'default';
      }}
    >
      <mesh position={[0, baseDiscY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[br + 0.058, br + 0.058, 0.05, 24]} />
        {mat}
      </mesh>
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[tr, br, h, 24]} />
        {mat}
      </mesh>
      <mesh position={[0, capY, 0]} castShadow>
        <sphereGeometry args={[tr * 1.2, 20, 12]} />
        {mat}
      </mesh>
      <sprite position={[0, spriteY, 0]} scale={[0.60, 0.60, 0.60]}>
        <spriteMaterial map={texture} transparent alphaTest={0.04} depthWrite={false} />
      </sprite>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single board square
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT_COLOR    = new THREE.Color('#f0d9b5');
const DARK_COLOR     = new THREE.Color('#b58863');
const LAST_EMISSIVE  = new THREE.Color('#bba800');
const SEL_EMISSIVE   = new THREE.Color('#d09500');
const CHECK_EMISSIVE = new THREE.Color('#c01818');

interface SquareTileProps {
  square: Square;
  isLight: boolean;
  isLastMove: boolean;
  isSelected: boolean;
  isCheck: boolean;
  isValidTarget: boolean;
  hasEnemy: boolean;
  position: [number, number, number];
  onClick: () => void;
}

function SquareTile({
  isLight, isLastMove, isSelected, isCheck,
  isValidTarget, hasEnemy, position, onClick,
}: SquareTileProps) {
  const [hov, setHov] = useState(false);

  let emissive = new THREE.Color('#000000');
  let emissiveInt = 0;
  if (isCheck)    { emissive = CHECK_EMISSIVE; emissiveInt = 0.50; }
  if (isLastMove) { emissive = LAST_EMISSIVE;  emissiveInt = 0.22; }
  if (isSelected) { emissive = SEL_EMISSIVE;   emissiveInt = 0.42; }
  if (hov && isValidTarget) emissiveInt = Math.min(emissiveInt + 0.20, 0.70);

  return (
    <group>
      <mesh
        position={position}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); setHov(true); }}
        onPointerLeave={(e) => { e.stopPropagation(); setHov(false); }}
      >
        <boxGeometry args={[0.998, 0.15, 0.998]} />
        <meshStandardMaterial
          color={isLight ? LIGHT_COLOR : DARK_COLOR}
          roughness={isLight ? 0.40 : 0.62}
          metalness={0.04}
          emissive={emissive}
          emissiveIntensity={emissiveInt}
        />
      </mesh>

      {isValidTarget && !hasEnemy && (
        <mesh position={[position[0], position[1] + 0.088, position[2]]}>
          <cylinderGeometry args={[0.135, 0.135, 0.026, 20]} />
          <meshStandardMaterial color="#080808" opacity={0.26} transparent />
        </mesh>
      )}
      {isValidTarget && hasEnemy && (
        <mesh position={[position[0], position[1] + 0.084, position[2]]}>
          <torusGeometry args={[0.425, 0.048, 8, 28]} />
          <meshStandardMaterial color="#080808" opacity={0.27} transparent />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The complete scene inside <Canvas>
// ─────────────────────────────────────────────────────────────────────────────

interface SceneProps {
  chess: Chess;
  fen: string;
  onMove: (m: { from: string; to: string; promotion?: string }) => boolean;
  flipped: boolean;
  disabled: boolean;
  lastMove: { from: string; to: string } | null;
  onPendingPromotion: (p: { from: Square; to: Square } | null) => void;
}

function BoardScene({ chess, fen, onMove, flipped, disabled, lastMove, onPendingPromotion }: SceneProps) {
  const [selectedSq, setSelectedSq] = useState<Square | null>(null);
  const [hoveredSq,  setHoveredSq]  = useState<Square | null>(null);
  const [draggingSq, setDraggingSq] = useState<Square | null>(null);

  useEffect(() => { setSelectedSq(null); }, [fen]);

  const validMoves = useMemo(() => {
    if (!selectedSq || disabled) return [];
    return chess.moves({ square: selectedSq, verbose: true });
  }, [selectedSq, disabled, fen]);

  const validSquares = useMemo(() => validMoves.map(m => m.to as Square), [validMoves]);

  const handleClick = useCallback((sq: Square) => {
    if (disabled) return;
    if (selectedSq) {
      if (validSquares.includes(sq)) {
        const mv = validMoves.find(m => m.to === sq);
        if (mv?.flags?.includes('p')) {
          onPendingPromotion({ from: selectedSq, to: sq });
          setSelectedSq(null);
        } else {
          onMove({ from: selectedSq, to: sq });
          setSelectedSq(null);
        }
      } else {
        const p = chess.get(sq);
        setSelectedSq(p && p.color === chess.turn() ? sq : null);
      }
    } else {
      const p = chess.get(sq);
      if (p && p.color === chess.turn()) setSelectedSq(sq);
    }
  }, [disabled, selectedSq, validSquares, validMoves, chess, onMove, onPendingPromotion]);

  const handleDragEnd = useCallback((sq: Square, pos: THREE.Vector3) => {
    const targetSq = xzToSquare(pos.x, pos.z, flipped);
    setDraggingSq(null);
    setSelectedSq(null);
    if (validSquares.includes(targetSq) && sq === selectedSq) {
      const mv = validMoves.find(m => m.to === targetSq);
      if (mv?.flags?.includes('p')) onPendingPromotion({ from: sq, to: targetSq });
      else onMove({ from: sq, to: targetSq });
    }
  }, [flipped, onMove, onPendingPromotion, selectedSq, validMoves, validSquares]);

  const allSquares = useMemo(() => {
    const out: { sq: Square; isLight: boolean }[] = [];
    for (let file = 0; file < 8; file++)
      for (let rank = 0; rank < 8; rank++) {
        const sq = (String.fromCharCode(97 + file) + (rank + 1)) as Square;
        out.push({ sq, isLight: (file + rank) % 2 === 1 });
      }
    return out;
  }, []);

  const pieces = useMemo(() => {
    const out: { sq: Square; type: string; color: 'w' | 'b' }[] = [];
    chess.board().forEach((row, rIdx) =>
      row.forEach((p, fIdx) => {
        if (!p) return;
        const sq = (String.fromCharCode(97 + fIdx) + (8 - rIdx)) as Square;
        out.push({ sq, type: p.type, color: p.color });
      }),
    );
    return out;
  }, [fen]);

  const inCheck   = chess.inCheck();
  const turnColor = chess.turn();

  return (
    <>
      <ambientLight intensity={0.52} color="#fff6ec" />
      <directionalLight
        position={[5, 16, 7]}
        intensity={1.40}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-6, 7, -6]} color="#ffc040" intensity={0.42} />
      <pointLight position={[6,  4,  8]} color="#fff0e0" intensity={0.22} />

      {/* Board frame */}
      <mesh receiveShadow position={[0, -0.095, 0]}>
        <boxGeometry args={[9.6, 0.19, 9.6]} />
        <meshStandardMaterial color="#2c1508" roughness={0.76} metalness={0.08} />
      </mesh>
      <mesh receiveShadow position={[0, -0.005, 0]}>
        <boxGeometry args={[8.28, 0.03, 8.28]} />
        <meshStandardMaterial color="#3e2010" roughness={0.66} metalness={0.06} />
      </mesh>

      {/* Squares */}
      {allSquares.map(({ sq, isLight }) => {
        const [x, z] = squareToXZ(sq, flipped);
        const sqPiece = chess.get(sq);
        const isKingCheck = inCheck && sqPiece?.type === 'k' && sqPiece?.color === turnColor;
        return (
          <SquareTile
            key={sq}
            square={sq}
            isLight={isLight}
            isLastMove={!!(lastMove && (lastMove.from === sq || lastMove.to === sq))}
            isSelected={selectedSq === sq}
            isCheck={isKingCheck}
            isValidTarget={validSquares.includes(sq)}
            hasEnemy={validSquares.includes(sq) && !!sqPiece}
            position={[x, 0, z]}
            onClick={() => handleClick(sq)}
          />
        );
      })}

      {/* Pieces */}
      {pieces.map(({ sq, type, color }) => {
        const [x, z] = squareToXZ(sq, flipped);
        return (
          <Piece3D
            key={`${sq}-${color}${type}`}
            pieceType={type}
            pieceColor={color}
            position={[x, 0, z]}
            isSelected={selectedSq === sq}
            isHovered={hoveredSq === sq}
            isDisabled={disabled}
            isDragging={draggingSq === sq}
            onClick={() => handleClick(sq)}
            onHover={(on) => setHoveredSq(on ? sq : null)}
            onDragStart={() => { setSelectedSq(sq); setDraggingSq(sq); }}
            onDragEnd={(position) => handleDragEnd(sq, position)}
          />
        );
      })}

      <CameraRig flipped={flipped} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        zoomSpeed={0.55}
        minDistance={7}
        maxDistance={22}
        minPolarAngle={Math.PI / 9}
        maxPolarAngle={Math.PI / 2.2}
        rotateSpeed={0.32}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported drop-in component (same props interface as <Board>)
// ─────────────────────────────────────────────────────────────────────────────

interface Board3DProps {
  chess: Chess;
  onMove: (m: { from: string; to: string; promotion?: string }) => boolean;
  flipped?: boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  statusText?: string;
}

export function Board3D({
  chess, onMove,
  flipped  = false,
  disabled = false,
  lastMove = null,
  statusText,
}: Board3DProps) {
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  const fen = chess.fen();

  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromo) {
      onMove({ from: pendingPromo.from, to: pendingPromo.to, promotion: piece });
      setPendingPromo(null);
    }
  };

  const fallback2D = (
    <Board
      chess={chess}
      onMove={onMove}
      flipped={flipped}
      disabled={disabled}
      lastMove={lastMove}
      statusText={statusText}
    />
  );

  return (
    <WebGLBoundary fallback={fallback2D}>
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.82)]">
        <Canvas
          shadows
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.14,
          }}
          camera={{ position: [0, 11, 8.5], fov: 38, near: 0.1, far: 100 }}
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #1e1408 0%, #080503 100%)',
          }}
        >
          <fog attach="fog" args={['#080503', 24, 40]} />
          <BoardScene
            chess={chess}
            fen={fen}
            onMove={onMove}
            flipped={flipped}
            disabled={disabled}
            lastMove={lastMove}
            onPendingPromotion={setPendingPromo}
          />
        </Canvas>

        {statusText && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary backdrop-blur-md">
            {statusText}
          </div>
        )}

        <PromotionDialog
          open={!!pendingPromo}
          color={chess.turn()}
          onChoose={handlePromotion}
        />
      </div>
    </WebGLBoundary>
  );
}
