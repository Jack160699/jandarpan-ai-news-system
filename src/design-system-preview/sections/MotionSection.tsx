"use client";

import { useState } from "react";
import { durations } from "@/design-system/tokens/durations";
import { easing, motionScale } from "@/design-system/tokens/motion";
import { Fade, Scale, Slide, Stagger, StaggerItem, MotionButton, MotionCard } from "@/design-system/motion";
import { Button } from "@/design-system/components/Button";
import { PreviewPanel, PreviewSection } from "../components/PreviewSection";

export function MotionSection() {
  const [fadeKey, setFadeKey] = useState(0);

  return (
    <PreviewSection
      id="motion"
      title="Motion"
      description="Duration tokens, easing curves, and Framer Motion presets. All animations respect prefers-reduced-motion."
    >
      <PreviewPanel label="Duration tokens">
        <div className="jds-preview__grid jds-preview__grid--3">
          {Object.entries(durations).map(([name, ms]) => (
            <div key={name} className="jds-preview__component-card">
              <p className="jds-preview__component-name">{name}</p>
              <p>{ms}ms</p>
            </div>
          ))}
        </div>
      </PreviewPanel>

      <PreviewPanel label="Easing curves">
        <div className="jds-preview__grid jds-preview__grid--2">
          {Object.entries(easing).map(([name, value]) => (
            <div key={name} className="jds-preview__component-card">
              <p className="jds-preview__component-name">{name}</p>
              <code style={{ fontSize: "0.75rem" }}>{value}</code>
            </div>
          ))}
        </div>
      </PreviewPanel>

      <PreviewPanel label="Micro-interactions">
        <p className="jds-preview__type-meta" style={{ marginBottom: "var(--jds-space-md)" }}>
          Tap scale: {motionScale.tap} · Hover lift: {motionScale.hoverLift}px
        </p>
        <div className="jds-preview__row">
          <MotionButton className="jds-button jds-button--primary">MotionButton</MotionButton>
          <MotionCard className="jds-card jds-card--elevated" style={{ padding: "var(--jds-space-lg)" }}>
            Hover me
          </MotionCard>
        </div>
      </PreviewPanel>

      <PreviewPanel label="Presets — Fade · Scale · Slide · Stagger">
        <div className="jds-preview__row" style={{ marginBottom: "var(--jds-space-lg)" }}>
          <Button variant="secondary" size="sm" onClick={() => setFadeKey((k) => k + 1)}>
            Replay animations
          </Button>
        </div>
        <div className="jds-preview__grid jds-preview__grid--2" key={fadeKey}>
          <Fade className="jds-preview__motion-demo">Fade in</Fade>
          <Scale className="jds-preview__motion-demo">Scale in</Scale>
          <Slide direction="up" className="jds-preview__motion-demo">
            Slide up
          </Slide>
          <Stagger className="jds-preview__motion-demo">
            {["One", "Two", "Three"].map((item) => (
              <StaggerItem key={item}>{item}</StaggerItem>
            ))}
          </Stagger>
        </div>
      </PreviewPanel>
    </PreviewSection>
  );
}
