export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-card">
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist or was moved.</p>
        <div className="error-actions">
          <a href="/">Go home</a>
        </div>
      </div>
    </div>
  );
}
