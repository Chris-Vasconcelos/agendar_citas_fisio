import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Splash.css';

// The original SVG is rendered in an isolated document. This prevents
// Tailwind and application CSS from overriding its strokes/animations.
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

const DRAW_MS = 6000;
const LAST_PATH_DELAY_MS = 2000;
const FINISH_HOLD_MS = 500;
const EXIT_MS = 650;

const logoDocument = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff}
body{display:grid;place-items:center;font-family:Arial,sans-serif}
svg{display:block;width:100%;height:auto;overflow:visible}
.blue{--ink:#052743}.gray{--ink:#748da0}
.draw{stroke:var(--ink);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;fill:none;stroke-dasharray:1 1;stroke-dashoffset:1;animation:trace 6s linear 1 both;animation-delay:var(--delay)}
.shape{fill:var(--ink);fill-opacity:0;animation:trace 6s linear 1 both,paint 6s linear 1 both;animation-delay:var(--delay),var(--delay)}
.letter{stroke-width:16;stroke-linecap:butt;stroke-linejoin:miter}.line{stroke-width:3}
.tagline{fill:#748da0;font:500 33px Arial,sans-serif;letter-spacing:5.4px;opacity:0;animation:caption 6s linear 1 both}
@keyframes trace{0%,4%{stroke-dashoffset:1;opacity:1}28%,64%{stroke-dashoffset:0;opacity:1}72%,100%{stroke-dashoffset:0;opacity:1}}
@keyframes paint{0%,22%{fill-opacity:0}34%,64%,72%,100%{fill-opacity:1}}
@keyframes caption{0%,54%{opacity:0}62%,76%,84%,100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.draw,.shape,.tagline{animation:none!important}.draw{stroke-dashoffset:0;opacity:1}.shape{fill-opacity:1}.tagline{opacity:1}}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="70 140 930 810" role="img" aria-label="MINA — El valor del movimiento">
${paths.map(({cls,delay,d})=>`<path class="draw ${cls}" pathLength="1" style="--delay:${delay}s" d="${d}"/>`).join('')}
<text class="tagline" x="540" y="903" text-anchor="middle">EL VALOR DEL MOVIMIENTO</text>
</svg></body></html>`;

export default function Splash({ ready, onRevealStart }) {
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [removed, setRemoved] = useState(false);
  const started = useRef(false);
  const markFrameLoaded = useCallback(() => setFrameLoaded(true), []);

  useEffect(() => {
    if (!frameLoaded) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setAnimationDone(true),
      reduced ? 0 : DRAW_MS + LAST_PATH_DELAY_MS + FINISH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [frameLoaded]);

  const leaving = ready && animationDone;
  useEffect(() => {
    if (!leaving || started.current) return undefined;
    started.current = true;
    onRevealStart?.();
    const timer = setTimeout(() => setRemoved(true), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, onRevealStart]);

  if (removed) return null;
  return (
    <div className={`mina-splash ${leaving ? 'mina-splash-leaving' : ''}`}
      role="status" aria-label="Cargando MINA">
      <div className="mina-splash-content">
        <iframe className="mina-splash-frame" title="Animación original del logo MINA"
          aria-hidden="true" tabIndex={-1} sandbox="" loading="eager"
          srcDoc={logoDocument} onLoad={markFrameLoaded} />
      </div>
    </div>
  );
}
