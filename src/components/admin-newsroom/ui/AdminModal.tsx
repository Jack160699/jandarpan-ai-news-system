"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type AdminModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

export function AdminModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="anr-modal-root" role="presentation">
      <button
        type="button"
        className="anr-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`anr-modal ${wide ? "anr-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="anr-modal-title"
      >
        <header className="anr-modal__head">
          <div>
            <h2 id="anr-modal-title">{title}</h2>
            {subtitle ? <p className="anr-meta">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="anr-btn anr-btn--ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>
        <div className="anr-modal__body">{children}</div>
        {footer ? <footer className="anr-modal__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
