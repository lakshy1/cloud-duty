"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function EmailConfirmedPage() {
  const [name, setName] = useState("there");

  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata ?? {};
      const derived =
        meta.first_name ||
        meta.full_name ||
        meta.name ||
        data.user?.email?.split("@")[0] ||
        "there";
      setName(derived);
    };
    loadUser();
  }, []);

  return (
    <div className="email-confirmed-page">
      <header className="email-confirmed-header">
        <div className="email-confirmed-brand">
          <span className="email-confirmed-dot" />
          <span className="email-confirmed-wordmark">CloudDuty</span>
        </div>
        <Link href="/" className="email-confirmed-nav">
          Go to Dashboard
        </Link>
      </header>

      <div className="email-confirmed-card">
        <div className="email-confirmed-icon-wrap">
          <svg
            className="email-confirmed-check"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="26" cy="26" r="26" className="email-confirmed-circle" />
            <path
              d="M15 27l8 8 14-16"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="email-confirmed-kicker">Email confirmed</div>
        <h1 className="email-confirmed-title">Hi {name}, you&apos;re in.</h1>
        <p className="email-confirmed-body">
          Your CloudDuty account is now active. Jump back into your workspace.
        </p>

        <Link href="/" className="email-confirmed-cta">
          Go to Dashboard
        </Link>
      </div>

      <footer className="email-confirmed-footer">
        <span>CloudDuty</span>
        <span className="email-confirmed-footer-sep" />
        <span>Security notice: this link works only after email confirmation.</span>
      </footer>
    </div>
  );
}
