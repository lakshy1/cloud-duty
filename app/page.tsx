import { Suspense } from "react";
import { Skeleton } from "./components/Skeleton";
import HomeClient from "./components/HomeClient";

function HomeFallback() {
  return (
    <div className="masonry" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="skeleton-card" key={`sk-${i}`}>
          <Skeleton className="skeleton-thumb" />
          <Skeleton className="skeleton-line skeleton-w-80" />
          <Skeleton className="skeleton-line skeleton-w-60" />
          <Skeleton className="skeleton-line sm skeleton-w-40" />
        </div>
      ))}
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
