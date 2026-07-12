"use client";

import { useRef } from "react";
import { Moon, Volume2, X } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { useIsDesktop } from "@/design-system/hooks";
import type { NotificationSettings } from "../types";

type ToggleRowProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="nc-settings__row" htmlFor={id}>
      <span className="nc-settings__row-text">
        <span className="nc-settings__row-label">{label}</span>
        <span className="nc-settings__row-desc">{description}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        className="nc-settings__toggle jds-focus-ring"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export type SettingsPanelProps = {
  open: boolean;
  settings: NotificationSettings;
  onClose: () => void;
  onChange: (patch: Partial<NotificationSettings>) => void;
};

export function SettingsPanel({
  open,
  settings,
  onClose,
  onChange,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  useModalA11y({
    open,
    onClose,
    panelRef,
    inertSelector: ".nc-page, .jdp-shell__feed",
  });

  if (!open) return null;

  return (
    <div className="nc-settings-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className={`nc-settings ${isDesktop ? "nc-settings--desktop" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nc-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="nc-settings__header">
          <div>
            <p className="nc-settings__kicker">Preferences</p>
            <h2 id="nc-settings-title" className="nc-settings__title">
              Notification settings
            </h2>
          </div>
          <button
            type="button"
            className="nc-settings__close jds-focus-ring"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="nc-settings__body">
          <section className="nc-settings__section" aria-labelledby="nc-settings-alerts">
            <h3 id="nc-settings-alerts" className="nc-settings__section-title">
              Alert types
            </h3>
            <ToggleRow
              id="nc-breaking"
              label="Breaking alerts"
              description="Urgent stories and weather warnings"
              checked={settings.breakingAlerts}
              onChange={(breakingAlerts) => onChange({ breakingAlerts })}
            />
            <ToggleRow
              id="nc-government"
              label="Government alerts"
              description="Official notices and circulars"
              checked={settings.governmentAlerts}
              onChange={(governmentAlerts) => onChange({ governmentAlerts })}
            />
            <ToggleRow
              id="nc-live"
              label="Live desk updates"
              description="Assembly sessions and developing stories"
              checked={settings.liveDeskUpdates}
              onChange={(liveDeskUpdates) => onChange({ liveDeskUpdates })}
            />
            <ToggleRow
              id="nc-digest"
              label="District digest"
              description="Evening roundup for your home district"
              checked={settings.districtDigest}
              onChange={(districtDigest) => onChange({ districtDigest })}
            />
          </section>

          <section className="nc-settings__section" aria-labelledby="nc-settings-quiet">
            <h3 id="nc-settings-quiet" className="nc-settings__section-title">
              Quiet hours
            </h3>
            <ToggleRow
              id="nc-quiet"
              label="Enable quiet hours"
              description="Mute non-urgent alerts overnight"
              checked={settings.quietHoursEnabled}
              onChange={(quietHoursEnabled) => onChange({ quietHoursEnabled })}
            />
            {settings.quietHoursEnabled ? (
              <div className="nc-settings__time-row">
                <label className="nc-settings__time" htmlFor="nc-quiet-start">
                  <Moon size={14} aria-hidden />
                  <span>From</span>
                  <input
                    id="nc-quiet-start"
                    type="time"
                    className="nc-settings__time-input jds-focus-ring"
                    value={settings.quietHoursStart}
                    onChange={(e) =>
                      onChange({ quietHoursStart: e.target.value })
                    }
                  />
                </label>
                <label className="nc-settings__time" htmlFor="nc-quiet-end">
                  <span>Until</span>
                  <input
                    id="nc-quiet-end"
                    type="time"
                    className="nc-settings__time-input jds-focus-ring"
                    value={settings.quietHoursEnd}
                    onChange={(e) => onChange({ quietHoursEnd: e.target.value })}
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className="nc-settings__section" aria-labelledby="nc-settings-sound">
            <h3 id="nc-settings-sound" className="nc-settings__section-title">
              Sound &amp; haptics
            </h3>
            <ToggleRow
              id="nc-sound"
              label="Alert sound"
              description="Play a tone for breaking alerts"
              checked={settings.soundEnabled}
              onChange={(soundEnabled) => onChange({ soundEnabled })}
            />
            <p className="nc-settings__note">
              <Volume2 size={14} aria-hidden />
              UI preview only — delivery preferences will sync when push ships.
            </p>
          </section>
        </div>

        <footer className="nc-settings__footer">
          <Button variant="primary" onClick={onClose}>
            Save preferences
          </Button>
        </footer>
      </div>
    </div>
  );
}
