"use client";

export type SettingToggleProps = {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SettingToggle({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: SettingToggleProps) {
  return (
    <div className="pv3-toggle">
      <div className="pv3-toggle__text">
        <label htmlFor={id} className="pv3-toggle__label">
          {label}
        </label>
        {hint ? <p className="pv3-toggle__hint">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        className={`pv3-toggle__switch${checked ? " is-on" : ""}`}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="pv3-toggle__thumb" aria-hidden />
      </button>
    </div>
  );
}
