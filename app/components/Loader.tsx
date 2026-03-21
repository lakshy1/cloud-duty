"use client";

type LoaderProps = {
  label?: string;
  fullScreen?: boolean;
};

export function Loader({ label = "Loading...", fullScreen = true }: LoaderProps) {
  return (
    <div
      className={`loader-shell${fullScreen ? " loader-screen" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="loader-spinner" aria-hidden="true" />
      <div className="loader-text">{label}</div>
    </div>
  );
}
