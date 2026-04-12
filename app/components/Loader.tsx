"use client";

type LoaderProps = {
  label?: string;
};

export function Loader({ label = "Loading..." }: LoaderProps) {
  return (
    <div className="loader-shell loader-screen" role="status" aria-live="polite">
      <div className="loader-spinner" aria-hidden="true" />
      <div className="loader-text">{label}</div>
    </div>
  );
}
