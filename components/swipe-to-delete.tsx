"use client";

import { useRef } from "react";

export function SwipeToDelete({
  children,
  onDelete,
  className = "",
  disabled = false,
  label = "item"
}: {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);

  function shouldIgnoreSwipe(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest("input, textarea, select, a");
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (disabled || shouldIgnoreSwipe(e.target)) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (disabled || startX.current === null) return;
    currentX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (disabled || startX.current === null || currentX.current === null || startY.current === null) {
      startX.current = null;
      startY.current = null;
      currentX.current = null;
      return;
    }

    const deltaX = startX.current - currentX.current;

    if (deltaX > 70) {
      onDelete();
    }

    startX.current = null;
    startY.current = null;
    currentX.current = null;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete();
    }
  }

  return (
    <div
      className={`swipe-delete ${disabled ? "disabled" : ""} ${className}`}
      role="group"
      aria-label={`${label} — swipe left or press Delete to remove`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="swipe-delete-bg" aria-hidden="true">Delete</div>
      <div className="swipe-delete-content">{children}</div>
    </div>
  );
}
