"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type {
  IplScoresSnapshot,
  IplTeamScore,
  IplWidgetCard,
} from "@/lib/super-menu/ipl-scores";
import {
  formatMatchSchedule,
  formatTeamScore,
  IPL_CLIENT_POLL_MS,
  teamMeta,
} from "@/lib/super-menu/ipl-scores";
import { isIplSeason } from "@/lib/super-menu/ipl-season";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";

type SuperMenuIplScoresProps = {
  menuOpen: boolean;
};

function TeamBadge({ team }: { team: IplTeamScore }) {
  const meta = teamMeta(team.teamId);
  if (team.logoUrl) {
    return (
      <span className="sm-ipl-team__logo">
        <Image
          src={team.logoUrl}
          alt=""
          width={28}
          height={28}
          unoptimized
        />
      </span>
    );
  }
  return (
    <span
      className="sm-ipl-team__logo sm-ipl-team__logo--fallback"
      style={{
        background: `linear-gradient(135deg, ${meta.primary}, ${meta.secondary})`,
      }}
      aria-hidden
    >
      {meta.short}
    </span>
  );
}

function TeamRow({
  team,
  showScore,
}: {
  team: IplTeamScore;
  showScore: boolean;
}) {
  return (
    <div className="sm-ipl-team">
      <TeamBadge team={team} />
      <span className="sm-ipl-team__name">{team.teamId}</span>
      {showScore ? (
        <span className="sm-ipl-team__score">{formatTeamScore(team)}</span>
      ) : null}
    </div>
  );
}

function IplCard({
  card,
  language,
}: {
  card: IplWidgetCard;
  language: NewsroomLanguage;
}) {
  const { match } = card;
  const badge = pickBilingualLabel(language, card.badgeEn, card.badgeHi);
  const isLive = card.kind === "live";
  const isCompleted = card.kind === "completed";
  const isFixture = card.kind === "upcoming" || card.kind === "next";
  const schedule = formatMatchSchedule(match.startAt, language);

  return (
    <article
      className={`sm-ipl-card sm-ipl-card--${card.kind}`}
      aria-label={`${badge} ${match.teamA.teamId} vs ${match.teamB.teamId}`}
    >
      <div className="sm-ipl-card__head">
        <span
          className={`sm-ipl-card__badge${isLive ? " sm-ipl-card__badge--live" : ""}`}
        >
          {isLive ? <span className="sm-ipl-card__dot" aria-hidden /> : null}
          {badge}
        </span>
        {isFixture ? (
          <time className="sm-ipl-card__time" dateTime={match.startAt}>
            {schedule}
          </time>
        ) : null}
      </div>

      {isCompleted ? (
        <p className="sm-ipl-card__result">
          {match.resultLine ??
            pickBilingualLabel(language, "Match finished", "मैच समाप्त")}
        </p>
      ) : (
        <div className="sm-ipl-card__teams">
          <TeamRow team={match.teamA} showScore={isLive} />
          <span className="sm-ipl-card__vs">
            {pickBilingualLabel(language, "vs", "बनाम")}
          </span>
          <TeamRow team={match.teamB} showScore={isLive} />
        </div>
      )}

      {isLive && match.statusLine ? (
        <p className="sm-ipl-card__status">{match.statusLine}</p>
      ) : null}
      {isLive && match.tossLine ? (
        <p className="sm-ipl-card__meta">{match.tossLine}</p>
      ) : null}
    </article>
  );
}

function IplSkeleton() {
  return (
    <div className="sm-ipl-stack sm-ipl-stack--loading" aria-hidden>
      <div className="sm-ipl-card sm-ipl-card--sk" />
      <div className="sm-ipl-card sm-ipl-card--sk" />
    </div>
  );
}

export function SuperMenuIplScores({ menuOpen }: SuperMenuIplScoresProps) {
  const { language } = useLanguage();
  const [snap, setSnap] = useState<IplScoresSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const inSeason = isIplSeason();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ipl-scores", { cache: "default" });
      if (!res.ok) {
        setSnap(null);
        return;
      }
      const data = (await res.json()) as IplScoresSnapshot;
      if (data.source === "cricapi" && data.cards.length > 0) {
        setSnap(data);
      } else {
        setSnap(null);
      }
    } catch {
      setSnap(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!menuOpen || !inSeason) return;
    let cancelled = false;
    setLoading(true);
    void load().then(() => {
      if (cancelled) return;
    });
    const id = window.setInterval(() => {
      if (!cancelled) void load();
    }, IPL_CLIENT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [menuOpen, inSeason, load]);

  if (!inSeason) {
    return null;
  }

  if (!snap && !loading) {
    return null;
  }

  const title = pickBilingualLabel(
    language,
    "Live IPL Scores",
    "लाइव IPL स्कोर"
  );

  return (
    <SuperMenuBlock id="sm-ipl-scores" title={title} className="sm-block--tight">
      {loading && !snap ? (
        <IplSkeleton />
      ) : snap ? (
        <div className="sm-ipl-stack" role="list">
          {snap.cards.map((card) => (
            <div key={`${card.kind}-${card.match.id}`} role="listitem">
              <IplCard card={card} language={language} />
            </div>
          ))}
        </div>
      ) : null}
    </SuperMenuBlock>
  );
}
