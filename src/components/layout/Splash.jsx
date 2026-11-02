import React, { useLayoutEffect, useRef, useState } from 'react';
import './Splash.css';

// Original eight MINA paths and stagger timings (seconds), unchanged.
const paths = [
  { cls: 'shape blue', delay: 0, d: 'M551 223 A45 46 0 1 1 461 223 A45 46 0 1 1 551 223Z' },
  { cls: 'shape blue', delay: 0.22, d: 'M291 585 C279 551 330 413 369 342 C390 304 412 278 434 284 C464 287 477 348 500 353 C518 364 556 313 600 293 C638 276 676 276 705 291 C651 287 605 332 572 374 C548 404 527 445 503 448 C475 456 467 408 454 385 C443 363 429 377 416 398 C389 442 367 500 346 553 C336 584 320 601 301 600 C295 600 292 596 291 585Z' },
  { cls: 'shape gray', delay: 0.6, d: 'M443 600 C492 576 519 506 562 449 C598 400 623 369 652 371 C693 369 719 430 743 480 C769 539 791 578 821 600 C777 607 743 579 720 548 C686 504 669 460 636 458 C604 454 576 494 547 527 C511 569 477 595 443 600Z' },
  { cls: 'letter blue', delay: 1.2, d: 'M128 780 V672 H134 L202 746 L274 672 V780' },
  { cls: 'letter blue', delay: 1.4, d: 'M423 665 V780' },
  { cls: 'letter blue', delay: 1.6, d: 'M575 780 V672 H581 L697 769 V665' },
  { cls: 'letter gray', delay: 1.8, d: 'M821 780 L884 672 H891 L951 780' },
  { cls: 'line gray', delay: 2, d: 'M467 835 H622' },
];

const ORIGINAL_CYCLE_MS = 6000;
const LAST_DELAY_MS = 2000;
const HOLD_MS = 450;
const EXIT_MS = 650;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const progress = (value, begin, end) => clamp01((value - begin) / (end - begin));

export default function Splash({ ready, onRevealStart }) {
  const svgRef = useRef(null);
  const onRevealRef = useRef(onRevealStart);
  const readyRef = useRef(ready);
  const [exiting, setExiting] = useState(false);
  const [drawingDone, setDrawingDone] = useState(false);
  const [removed, setRemoved] = useState(false);
  const exitingRef = useRef(false);
  const rafRef = useRef(0);
  onRevealRef.current = onRevealStart;
  readyRef.current = ready;

  // Imperatively animate every SVG stroke: no iframe, CSS keyframe,
  // pathLength normalization or OS reduced-motion override can skip the drawing.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const strokes = Array.from(svg.querySelectorAll('path')).map((node, index) => {
      const length = Math.max(1, node.getTotalLength());
      const isShape = paths[index].cls.includes('shape');
      const ink = paths[index].cls.includes('gray') ? '#748da0' : '#052743';
      node.style.setProperty('stroke', ink, 'important');
      node.style.setProperty('stroke-dasharray', `${length} ${length}`, 'important');
      node.style.setProperty('stroke-dashoffset', String(length), 'important');
      node.style.setProperty('opacity', '1', 'important');
      node.style.setProperty('fill', isShape ? ink : 'none', 'important');
      if (isShape) node.style.setProperty('fill-opacity', '0', 'important');
      return { node, length, isShape, delayMs: paths[index].delay * 1000 };
    });
    const tagline = svg.querySelector('text');
    if (tagline) tagline.style.setProperty('opacity', '0', 'important');
    let stopped = false;
    let startedAt = null;
    const frame = (timestamp) => {
      if (stopped) return;
      if (startedAt === null) startedAt = timestamp;
      const elapsed = timestamp - startedAt;
      for (const {node,length,isShape,delayMs} of strokes) {
        const local = (elapsed - delayMs) / ORIGINAL_CYCLE_MS;
        const drawn = progress(local, .04, .28);
        node.style.setProperty('stroke-dashoffset', String(length * (1 - drawn)), 'important');
        if (isShape) node.style.setProperty('fill-opacity', String(progress(local, .22, .34)), 'important');
      }
      if (tagline) tagline.style.setProperty('opacity', String(progress(elapsed / ORIGINAL_CYCLE_MS, .54, .62)), 'important');
      if (elapsed >= ORIGINAL_CYCLE_MS + LAST_DELAY_MS + HOLD_MS) {
        setDrawingDone(true);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Exit only when the complete original drawing AND the data are ready.
  useLayoutEffect(() => {
    if (!ready || !drawingDone || exitingRef.current) return undefined;
    exitingRef.current = true;
    setExiting(true);
    onRevealRef.current?.();
    const timer = setTimeout(() => setRemoved(true), EXIT_MS);
    return () => clearTimeout(timer);
  }, [ready, drawingDone]);

  if (removed) return null;
  return (
    <div className={`mina-splash ${exiting ? 'mina-splash-leaving' : ''}`} role="status" aria-label="Cargando MINA">
      <div className="mina-splash-content">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="70 140 930 810"
          role="img" aria-label="MINA — El valor del movimiento">
          {paths.map(({cls,d}, index) => (
            <path key={index} className={`mina-stroke ${cls}`} d={d} />
          ))}
          <text className="mina-tagline" x="540" y="903" textAnchor="middle">EL VALOR DEL MOVIMIENTO</text>
        </svg>
      </div>
    </div>
  );
}
