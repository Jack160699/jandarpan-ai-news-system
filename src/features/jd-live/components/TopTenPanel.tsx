"use client";

import React from "react";
import Image from "next/image";
import { useBroadcast } from "../BroadcastContext";

/**
 * आज की 10 बड़ी खबरें — ranked story side panel.
 */
export function TopTenPanel() {
  const { state, dispatch } = useBroadcast();
  const { queue, currentSegment, language } = state;

  const topTen = queue.filter((s) => !s.isIntro).slice(0, 10);
  const panelTitle =
    language === "hi" ? "आज की 10 बड़ी खबरें" : "TOP 10 STORIES TODAY";

  return (
    <aside className="jdl-top10" aria-label={panelTitle}>
      <div className="jdl-top10__title">{panelTitle}</div>

      <ol className="jdl-top10__list">
        {topTen.map((seg, idx) => {
          const headline =
            language === "hi" ? (seg.headlineHi || seg.headline) : seg.headline;
          const category =
            language === "hi" ? (seg.categoryLabelHi || seg.categoryLabel) : seg.categoryLabel;
          const district =
            language === "hi" ? (seg.districtHi || seg.district) : seg.district;
          const isActive = currentSegment?.id === seg.id;
          const rank = seg.countdownRank ?? (10 - idx);

          return (
            <li
              key={seg.id}
              className={`jdl-top10__item ${isActive ? "jdl-top10__item--active" : ""}`}
              onClick={() =>
                dispatch({ type: "INTERRUPT_BREAKING", segment: seg })
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  dispatch({ type: "INTERRUPT_BREAKING", segment: seg });
                }
              }}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="jdl-top10__rank">{rank}</span>

              {seg.imageUrl && (
                <div className="jdl-top10__thumb">
                  <Image
                    src={seg.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}

              <div className="jdl-top10__text">
                <div className="jdl-top10__meta">
                  {district || category}
                  {seg.isBreaking && (
                    <span className="jdl-top10__breaking-tag">
                      {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
                    </span>
                  )}
                </div>
                <div className="jdl-top10__headline">{headline}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
