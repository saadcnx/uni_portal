"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

/**
 * Re-render reasoning:
 * SearchInput isolates text input state locally via `useState` so that keystrokes
 * only re-render the input itself, never the table, parent page, sidebar, or header.
 * Propagating changes via `useDebouncedValue` (300ms) ensures expensive URL query
 * parameter updates and TanStack Query network fetches only trigger when the user
 * finishes typing.
 */

export interface SearchInputProps {
  /** Controlled or external initial value (e.g., from URL search query) */
  value?: string;
  /** Uncontrolled default value */
  defaultValue?: string;
  /** Callback fired with the debounced search text */
  onSearch: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search results or table data are currently fetching */
  isFetching?: boolean;
  /** Debounce delay in milliseconds. Defaults to 300ms. */
  debounceMs?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional container CSS class */
  className?: string;
  /** Accessible label */
  "aria-label"?: string;
}

export function SearchInput({
  value,
  defaultValue,
  onSearch,
  placeholder = "Search...",
  isFetching = false,
  debounceMs = 300,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Search",
}: SearchInputProps) {
  // Local input text state so rapid keystrokes stay fast and isolated
  const [text, setText] = useState<string>(value ?? defaultValue ?? "");
  const [prevPropValue, setPrevPropValue] = useState<string | undefined>(value);

  // Synchronize external value changes (e.g., URL reset or navigation)
  if (value !== undefined && value !== prevPropValue) {
    setPrevPropValue(value);
    setText(value);
  }

  // 300ms debounced value
  const debouncedText = useDebouncedValue(text, debounceMs);

  // Track the last value sent to onSearch to prevent duplicate triggers
  const lastEmittedValueRef = useRef<string>(value ?? defaultValue ?? "");
  const isFirstMountRef = useRef<boolean>(true);

  useEffect(() => {
    // Skip firing on the initial render mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (debouncedText !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = debouncedText;
      onSearch(debouncedText);
    }
  }, [debouncedText, onSearch]);

  // Immediately clear input text and notify onSearch without waiting for debounce
  const handleClear = useCallback(() => {
    setText("");
    lastEmittedValueRef.current = "";
    onSearch("");
  }, [onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const hasText = text.length > 0;

  return (
    <div
      className={cn(
        "relative flex items-center w-full max-w-sm",
        className
      )}
    >
      {/* Search icon */}
      <Search
        className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />

      <Input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "h-9 pl-8 text-sm bg-card transition-colors placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none",
          // Extra right padding when both spinner and clear button are present
          isFetching && hasText
            ? "pr-14"
            : isFetching || hasText
            ? "pr-9"
            : "pr-3"
        )}
      />

      {/* Right side indicators: fetching spinner and/or clear button */}
      <div className="absolute right-2.5 flex items-center gap-1.5">
        {isFetching && (
          <Spinner
            className="size-3.5 text-muted-foreground animate-spin"
            aria-label="Searching..."
          />
        )}
        {hasText && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-xs p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
            aria-label="Clear search text"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
