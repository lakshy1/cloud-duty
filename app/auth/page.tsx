import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page auth-page--duo">
          <div className="auth-dual auth-dual--loading" />
        </div>
      }
    >
      <AuthClient />
    </Suspense>
  );
}
