import { Suspense } from "react";
import InboxClient from "./InboxClient";

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="page-shell" />}>
      <InboxClient />
    </Suspense>
  );
}
