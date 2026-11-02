import React, { useEffect, useRef, useState } from 'react';
import './Splash.css';

// Exact MINA SVG paths, pathLength and staggered delays from mina-trazos-animados.html.
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

const DRAW_DURATION_MS = 6000;
const LAST_DELAY_MS = 2000;
const COMPLETE_HOLD_MS = 450;
const EXIT_MS = 650;

export default function Splash({ ready, onRevealStart }) {
  const [animationDone, setAnimationDone] = useState(false);
  const [removed, setRemoved] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // All eight original paths complete (6s animation + final path's 2s delay).
    const timer = setTimeout(
      () => setAnimationDone(true),
      reducedMotion ? 0 : DRAW_DURATION_MS + LAST_DELAY_MS + COMPLETE_HOLD_MS
    );
    return () => clearTimeout(timer);
  }, []);

  const leaving = ready && animationDone;

  useEffect(() => {
    if (!leaving || startedRef.current) return undefined;
    startedRef.current = true;
    onRevealStart?.();
    const timer = setTimeout(() => setRemoved(true), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onRevealStart]);

  if (removed) return null;

  return (
    <div className={`mina-splash ${leaving ? 'mina-splash-leaving' : ''}`}
      role="status" aria-label="Cargando MINA">
      <div className="mina-splash-content">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="70 140 930 810"
          role="img" aria-label="MINA — El valor del movimiento">
          {paths.map(({ cls, delay, d }, index) => (
            <path key={index} className={`draw ${cls}`} pathLength="1"
              style={{ '--delay': `${delay}s` }} d={d} />
          ))}
          <text className="tagline" x="540" y="903" textAnchor="middle">EL VALOR DEL MOVIMIENTO</text>
        </svg>
      </div>
    </div>
  );
}
