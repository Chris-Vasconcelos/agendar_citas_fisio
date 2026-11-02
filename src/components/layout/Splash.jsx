import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Splash.css';

// Exact paths from the original MINA animated logo.
const paths = [
  { cls: 'shape blue', delay: 0, d: 'M551 223 A45 46 0 1 1 461 223 A45 46 0 1 1 551 223Z' },
  { cls: 'shape blue', delay: 160, d: 'M291 585 C279 551 330 413 369 342 C390 304 412 278 434 284 C464 287 477 348 500 353 C518 364 556 313 600 293 C638 276 676 276 705 291 C651 287 605 332 572 374 C548 404 527 445 503 448 C475 456 467 408 454 385 C443 363 429 377 416 398 C389 442 367 500 346 553 C336 584 320 601 301 600 C295 600 292 596 291 585Z' },
  { cls: 'shape gray', delay: 380, d: 'M443 600 C492 576 519 506 562 449 C598 400 623 369 652 371 C693 369 719 430 743 480 C769 539 791 578 821 600 C777 607 743 579 720 548 C686 504 669 460 636 458 C604 454 576 494 547 527 C511 569 477 595 443 600Z' },
  { cls: 'letter blue', delay: 750, d: 'M128 780 V672 H134 L202 746 L274 672 V780' },
  { cls: 'letter blue', delay: 950, d: 'M423 665 V780' },
  { cls: 'letter blue', delay: 1150, d: 'M575 780 V672 H581 L697 769 V665' },
  { cls: 'letter gray', delay: 1350, d: 'M821 780 L884 672 H891 L951 780' },
  { cls: 'line gray', delay: 1550, d: 'M467 835 H622' },
];

export default function Splash({ ready, onRevealStart }) {
  const svgRef = useRef(null);
  const [minimumDone, setMinimumDone] = useState(false);
  const [removed, setRemoved] = useState(false);
  const startedRef = useRef(false);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const elements = [...svg.querySelectorAll('path')];
    const tagline = svg.querySelector('.mina-splash-tagline');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animations = [];
    let frame1 = 0;
    let frame2 = 0;

    // The browser first receives real lengths and invisible strokes.
    // Animations start on a subsequent frame, avoiding the CSS animation flash.
    for (const path of elements) {
      const length = Math.ceil(path.getTotalLength()) + 2;
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = String(length);
      path.style.opacity = '1';
      path.style.fillOpacity = path.classList.contains('shape') ? '0' : '';
    }
    if (tagline) tagline.style.opacity = '0';

    const showComplete = () => {
      elements.forEach((path) => {
        path.style.strokeDashoffset = '0';
        if (path.classList.contains('shape')) path.style.fillOpacity = '1';
      });
      if (tagline) tagline.style.opacity = '1';
    };

    if (reduceMotion || typeof elements[0]?.animate !== 'function') {
      showComplete();
      setMinimumDone(true);
      return undefined;
    }

    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        elements.forEach((path, index) => {
          const length = Math.ceil(path.getTotalLength()) + 2;
          const delay = paths[index].delay;
          animations.push(path.animate(
            [{ strokeDashoffset: String(length) }, { strokeDashoffset: '0' }],
            { duration: 920, delay, easing: 'ease-out', fill: 'forwards' }
          ));
          if (path.classList.contains('shape')) {
            animations.push(path.animate(
              [{ fillOpacity: 0 }, { fillOpacity: 1 }],
              { duration: 520, delay: delay + 730, easing: 'ease-out', fill: 'forwards' }
            ));
          }
        });
        if (tagline) animations.push(tagline.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 440, delay: 2080, easing: 'ease-out', fill: 'forwards' }
        ));
      });
    });

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setMinimumDone(true), reduceMotion ? 0 : 2680);
    return () => clearTimeout(t);
  }, []);

  const leaving = ready && minimumDone;
  useEffect(() => {
    if (!leaving || startedRef.current) return undefined;
    startedRef.current = true;
    onRevealStart?.();
    const timer = setTimeout(() => setRemoved(true), 650);
    return () => clearTimeout(timer);
  }, [leaving, onRevealStart]);

  if (removed) return null;

  return (
    <div className={`mina-splash ${leaving ? 'mina-splash-leaving' : ''}`}
      role="status" aria-label="Cargando MINA">
      <div className="mina-splash-content">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="70 140 930 810"
          role="img" aria-label="MINA — El valor del movimiento">
          {paths.map(({ cls, d }, i) => (
            <path key={i} className={`mina-splash-draw ${cls}`} d={d} />
          ))}
          <text className="mina-splash-tagline" x="540" y="903" textAnchor="middle">
            EL VALOR DEL MOVIMIENTO
          </text>
        </svg>
        <span className="mina-splash-visually-hidden">Preparando agenda y expedientes</span>
      </div>
    </div>
  );
}
