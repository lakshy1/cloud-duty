"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <div className="error-card">
        <h1>Something went wrong</h1>
        <p>We hit an unexpected error. Try again or go back to the homepage.</p>
        <div className="error-actions">
          <button onClick={reset}>Try again</button>
          <a href="/">Go home</a>
        </div>
        <div className="error-details">
          <div className="error-title">Error details</div>
          <pre>{error.message}</pre>
        </div>
      </div>
    </div>
  );
}
