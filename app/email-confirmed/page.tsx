"use client";

import Link from "next/link";

export default function EmailConfirmedPage() {
  return (
    <div className="email-confirmed-page">
      <div className="email-confirmed-card">

        {/* Brand dot + wordmark */}
        <div className="email-confirmed-brand">
          <span className="email-confirmed-dot" />
          <span className="email-confirmed-wordmark">CloudDuty</span>
        </div>

        {/* Check icon */}
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

        {/* Text */}
        <h1 className="email-confirmed-title">Email confirmed!</h1>
        <p className="email-confirmed-body">
          Your CloudDuty account is now active. You&rsquo;re ready to go.
        </p>

        {/* CTA */}
        <Link href="/" className="email-confirmed-cta">
          Go to CloudDuty &rarr;
        </Link>

        {/* Footer note */}
        <p className="email-confirmed-note">
          Already have a session?{" "}
          <Link href="/" className="email-confirmed-link">
            Take me to my feed
          </Link>
        </p>
      </div>
    </div>
  );
}
