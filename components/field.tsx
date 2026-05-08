import React from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
