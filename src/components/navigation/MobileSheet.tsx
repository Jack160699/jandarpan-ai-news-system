"use client";

import { useEffect } from "react";

type MobileSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function MobileSheet({ open, onClose, title, children }: MobileSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="mobile-sheet-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-sheet-title"
      >
        <div className="mobile-sheet__handle" aria-hidden />
        <p id="mobile-sheet-title" className="mobile-sheet__title">
          {title}
        </p>
        {children}
      </div>
    </>
  );
}
