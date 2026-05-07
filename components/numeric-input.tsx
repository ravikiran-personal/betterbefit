"use client";

import { useEffect, useState } from "react";

export function NumericInput({
  value,
  onChange,
  placeholder
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      setDraft(String(value));
    }

    if (value === "") {
      setDraft("");
    }
  }, [value]);

  return (
    <input
      className="input"
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        let val = e.target.value;

        val = val.replace(/[^0-9.]/g, "");

        const parts = val.split(".");
        if (parts.length > 2) {
          val = parts[0] + "." + parts.slice(1).join("");
        }

        const finalParts = val.split(".");
        if (finalParts[1]?.length > 1) {
          val = finalParts[0] + "." + finalParts[1].slice(0, 1);
        }

        setDraft(val);

        if (val === "" || val === ".") {
          onChange("");
          return;
        }

        if (val.endsWith(".")) {
          return;
        }

        onChange(Number(val));
      }}
      onBlur={() => {
        if (draft === "" || draft === ".") {
          setDraft("");
          onChange("");
          return;
        }

        const num = Number(draft);

        if (!Number.isFinite(num)) {
          setDraft("");
          onChange("");
          return;
        }

        const rounded = Math.round(num * 10) / 10;
        setDraft(String(rounded));
        onChange(rounded);
      }}
    />
  );
}
