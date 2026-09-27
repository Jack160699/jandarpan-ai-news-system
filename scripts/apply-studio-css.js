const fs = require('fs');
const path = require('path');

const cssPath = path.resolve('src/features/jd-live/styles/studio.css');
let content = fs.readFileSync(cssPath, 'utf8');

const startMarker = '/* ─── COMPACT EDITORIAL NEWS CARD (Requirements #5, #6, #7) ─────────────── */';
const endMarker = '/* ─── COMMENT MODAL ───────────────────────────────────────────────── */';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found! startIndex:", startIndex, "endIndex:", endIndex);
  process.exit(1);
}

const replacement = `/* ─── EDITORIAL NEWS CARD & FULL-WIDTH ENGAGEMENT STRIP (Objectives A & UX) ─── */
.jdl-queue-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  padding: 0;
  margin-bottom: 14px;
  background: var(--jd-paper, #ffffff);
  border: 1px solid var(--jd-line, #e2dac9);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  box-sizing: border-box;
  text-align: left;
  transition: background 0.15s ease, opacity 0.35s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  position: relative;
}

.jdl-queue-card:last-child {
  margin-bottom: 0;
}

.jdl-queue-card:hover {
  box-shadow: 0 4px 12px rgba(10, 37, 80, 0.07);
}

.jdl-queue-card--tv-active {
  border-color: var(--jdl-red, #c8102e);
  box-shadow: 0 0 0 1.5px var(--jdl-red, #c8102e), 0 4px 14px rgba(200, 16, 46, 0.15);
}

.jdl-queue-card--consumed {
  opacity: 0.72;
}

.jdl-queue-card--consumed:hover {
  opacity: 0.96;
}

.jdl-queue-card__consumed-tag {
  font-size: 9.5px;
  font-weight: 700;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  letter-spacing: 0.02em;
}

@media (prefers-reduced-motion: reduce) {
  .jdl-queue-card,
  .jdl-queue-card__heart-burst {
    transition: none !important;
    animation: none !important;
  }
}

.jdl-queue-card__main-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  cursor: pointer;
  position: relative;
  user-select: none;
  padding: 0;
  background: transparent;
  transition: background 0.15s ease;
}

/* 1. Top Media Wrap: Full Card Width, 16:9 Editorial Aspect Ratio */
.jdl-queue-card__media-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 210px;
  min-height: 150px;
  overflow: hidden;
  background: #0a1628;
  cursor: pointer;
}

.jdl-queue-card__media-badges {
  position: absolute;
  top: 9px;
  left: 9px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 3;
}

.jdl-queue-card__media-time {
  position: absolute;
  bottom: 8px;
  right: 9px;
  z-index: 3;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.jdl-queue-card__tag {
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.jdl-queue-card__breaking {
  font-size: 9.5px;
  font-weight: 800;
  background: var(--jdl-red, #c8102e);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  box-shadow: 0 1px 4px rgba(200, 16, 46, 0.4);
}

/* 2. Middle Body: Headline & Active Status */
.jdl-queue-card__body {
  width: 100%;
  padding: 10px 12px 6px 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  box-sizing: border-box;
}

.jdl-queue-card__headline {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--jd-ink, #16130d);
  line-height: 1.38;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: -0.01em;
}

.jdl-queue-card__headline:hover {
  color: var(--jdl-red, #c8102e);
}

.jdl-queue-card__live-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  color: var(--jdl-red, #c8102e);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 4px;
}

.jdl-queue-card__pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--jdl-red, #c8102e);
  box-shadow: 0 0 6px rgba(200, 16, 46, 0.7);
  animation: jdl-pulse 1.2s ease-in-out infinite;
}

.jdl-queue-card__heart-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
  animation: jdl-heart-burst 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.jdl-queue-card__heart-burst svg {
  width: 52px;
  height: 52px;
  filter: drop-shadow(0 4px 12px rgba(225, 29, 72, 0.65));
}

@keyframes jdl-heart-burst {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 1;
  }
  60% {
    transform: translate(-50%, -50%) scale(0.95);
    opacity: 0.95;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0;
  }
}

/* 3. FULL-WIDTH ENGAGEMENT STRIP (Directly attached immediately beneath story headline) */
/* Exactly 5 actions: Like | Comment | Views | WhatsApp | पढ़ें */
.jdl-card-engagement-row {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  flex-wrap: nowrap;
  box-sizing: border-box;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}

.jdl-engagement-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 44px;
  min-height: 44px;
  padding: 0 4px;
  border-radius: 0;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  color: var(--jdl-ink-secondary, #4b5563);
  background: transparent;
  border: none;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  text-decoration: none;
  user-select: none;
  white-space: nowrap;
  flex: 1 1 0%;
  min-width: 0;
  box-sizing: border-box;
}

.jdl-engagement-btn {
  cursor: pointer;
  transition: all 0.15s ease;
}

.jdl-engagement-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--jdl-ink-primary, #111827);
}

.jdl-engagement-btn:active {
  background: rgba(0, 0, 0, 0.1);
}

.jdl-engagement-btn--liked {
  color: #e11d48;
  background: rgba(225, 29, 72, 0.08);
}

.jdl-engagement-btn--liked:hover {
  background: rgba(225, 29, 72, 0.14);
}

.jdl-engagement-btn--whatsapp {
  flex: 1 1 0%;
}

.jdl-engagement-btn--whatsapp:hover {
  background: rgba(37, 211, 102, 0.12);
}

.jdl-engagement-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.jdl-engagement-count {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  opacity: 0.95;
  font-variant-numeric: tabular-nums;
}

.jdl-engagement-item--views {
  opacity: 0.85;
}

/* Action 5: Primary Action: पढ़ें (Visually highlighted, perfectly aligned with other 4) */
.jdl-queue-card__read-btn {
  flex: 1.15 1 0%;
  height: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: var(--jdl-red, #c8102e);
  color: #ffffff !important;
  border: none;
  border-right: none;
  border-radius: 0;
  padding: 0 6px;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.15s ease;
  box-sizing: border-box;
}

.jdl-queue-card__read-btn:hover {
  background: var(--jdl-red-dark, #a00d24);
}

.jdl-queue-card__read-btn:active {
  background: #870b1d;
}

`;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(cssPath, newContent, 'utf8');
console.log("Successfully updated studio.css!");
