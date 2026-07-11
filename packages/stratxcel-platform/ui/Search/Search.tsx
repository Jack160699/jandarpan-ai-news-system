import * as React from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@stratxcel/platform/utils/cn";
import { focusRingClass } from "@stratxcel/platform/accessibility/aria";

export interface SearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

export const Search = React.forwardRef<HTMLInputElement, SearchProps>(
  ({ className, value, defaultValue, onSearch, onClear, onKeyDown, onChange, ...props }, ref) => {
    const [internal, setInternal] = React.useState(
      (defaultValue as string | undefined) ?? ""
    );
    const current = value !== undefined ? String(value) : internal;
    const showClear = current.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) setInternal(e.target.value);
      onChange?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.key === "Enter") onSearch?.(e.currentTarget.value);
    };

    const handleClear = () => {
      if (value === undefined) setInternal("");
      onClear?.();
    };

    return (
      <div className={cn("jds-search", className)} role="search">
        <SearchIcon className="jds-search__icon" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value}
          defaultValue={defaultValue}
          className={cn("jds-search__input", "jds-interactive", focusRingClass)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            className={cn("jds-search__clear", focusRingClass)}
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>
    );
  }
);
Search.displayName = "Search";
