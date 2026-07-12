import * as React from "react";
import { useId } from "react";
import { cn } from "@stratxcel/platform/utils/cn";
import { focusRingClass } from "@stratxcel/platform/accessibility/aria";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, disabled, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className={cn("jds-input-wrapper", className)}>
        {label && (
          <label htmlFor={inputId} className="jds-input-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn("jds-input", "jds-interactive", focusRingClass, error && "jds-input--error")}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          {...props}
        />
        {hint && !error && (
          <span id={hintId} className="jds-input-hint">
            {hint}
          </span>
        )}
        {error && (
          <span id={errorId} className="jds-input-hint jds-input-hint--error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
