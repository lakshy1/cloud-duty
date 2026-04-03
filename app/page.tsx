import { Suspense } from "react";
import HomeClient from "./components/HomeClient";

function HomeFallback() {
  return (
    <div className="loader-shell loader-screen" role="status" aria-live="polite">
      <div className="loader-spinner" aria-hidden="true" />
      <div className="loader-text">Loading...</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeClient />
    </Suspense>
  );
}
