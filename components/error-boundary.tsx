"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "An unexpected error occurred."
    };
  }

  handleExportData = () => {
    try {
      const raw = localStorage.getItem("recomp-tracker-v2") || localStorage.getItem("recomp-tracker-v1");
      if (!raw) {
        alert("No saved data found to export.");
        return;
      }
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recomp-tracker-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not export data.");
    }
  };

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "32px",
          background: "#0b1220",
          color: "#e5e7eb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "2rem" }}>⚠</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#9ca3af", margin: 0, maxWidth: "480px", fontSize: "0.9rem" }}>
          {this.state.message}
        </p>
        <p style={{ color: "#9ca3af", margin: 0, maxWidth: "480px", fontSize: "0.85rem" }}>
          Your data is safe in your browser. You can export it before reloading.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
          <button
            onClick={this.handleExportData}
            style={{
              background: "#1f2937",
              color: "#e5e7eb",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Export data
          </button>
          <button
            onClick={this.handleReload}
            style={{
              background: "#34d399",
              color: "#0b1220",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem"
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
