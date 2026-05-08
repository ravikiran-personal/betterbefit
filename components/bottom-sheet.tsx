import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    lastYRef.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    lastYRef.current = e.touches[0].clientY;
    const delta = lastYRef.current - startYRef.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }

  function onTouchEnd() {
    const delta = lastYRef.current - startYRef.current;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "";
      sheetRef.current.style.transform = "";
    }
    if (delta > 90) onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className={`sheet-backdrop${isOpen ? " open" : ""}`} onClick={onClose} />
      <div
        ref={sheetRef}
        className={`bottom-sheet${isOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet-handle-row">
          <div className="sheet-handle" />
        </div>
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
