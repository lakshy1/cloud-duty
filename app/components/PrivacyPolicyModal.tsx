"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

type Props = { onClose: () => void };

const PAGES = [
  {
    title: "Privacy Policy",
    content: (
      <>
        <p className="pp-meta">Effective Date: April 12, 2026 · Reading Queue</p>
        <p>Reading Queue takes your privacy seriously. This policy explains what information we collect, how we use it, and the choices you have.</p>

        <h3>1. What This Policy Covers</h3>
        <p>This Privacy Policy describes how Reading Queue ("we," "us," or "our") collects, uses, and shares personal information when you use our website, Android app, and related services (the "Services"). It applies to Reading Queue as the data controller — meaning the entity that decides how your personal data is processed.</p>
        <p>This policy does not cover third-party websites or services that may be linked to from Reading Queue. We encourage you to review the privacy policies of any third-party services you choose to use.</p>
      </>
    ),
  },
  {
    title: "Information We Collect",
    content: (
      <>
        <h3>2. Information We Collect</h3>
        <h4>Information you provide directly</h4>
        <ul>
          <li>Account details: your name, username, email address, and password</li>
          <li>Profile content: bio, profile photo, links, and project information</li>
          <li>Posts and content: articles, project descriptions, and other material you publish</li>
          <li>Messages: direct messages sent between mutually-connected users</li>
          <li>Communications: feedback, support requests, or other messages you send us</li>
        </ul>
        <h4>Information we collect automatically</h4>
        <ul>
          <li>Usage data: pages visited, features used, posts viewed, and interaction metrics</li>
          <li>Device and browser data: IP address, browser type, operating system, device identifiers</li>
          <li>Log data: timestamps, referring URLs, and error logs</li>
          <li>Cookies and similar technologies: session identifiers and preference cookies</li>
        </ul>
        <h4>Information from AI features</h4>
        <p>When you use our AI-powered post generation or AI Support Chatbot (powered by Groq API), the text you input may be processed by Groq's infrastructure. We do not retain AI conversation logs beyond the session unless you explicitly save generated content. Please review Groq's Privacy Policy at groq.com/privacy for details.</p>
      </>
    ),
  },
  {
    title: "How We Use & Share Your Information",
    content: (
      <>
        <h3>3. How We Use Your Information</h3>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Create and maintain your account and provide access to the Services</li>
          <li>Display your profile and content to other users on the platform</li>
          <li>Power platform features including the follow system, notifications, search, and messaging</li>
          <li>Operate AI-assisted features such as post generation and the support chatbot</li>
          <li>Monitor platform health, detect abuse, and enforce our Terms of Service</li>
          <li>Send account-related notifications such as new followers, replies, and messages</li>
          <li>Analyze usage patterns to improve and develop new features</li>
          <li>Respond to support requests and communications from you</li>
          <li>Comply with applicable legal obligations</li>
        </ul>

        <h3>4. How We Share Your Information</h3>
        <p>We do not sell your personal information. We may share it in the following limited circumstances:</p>
        <h4>With other users</h4>
        <p>Your public profile — including your name, username, photo, projects, posts, and follower count — is visible to all users. Direct messages are visible only to the intended recipient(s).</p>
        <h4>With service providers</h4>
        <p>We use trusted third-party providers including Supabase (database and authentication), Groq API (AI features), and Capacitor (cross-platform delivery). These providers are permitted to access your information only to perform services on our behalf.</p>
        <h4>For legal reasons</h4>
        <p>We may disclose your information if required by law, court order, or government authority, or if we believe disclosure is necessary to protect the rights, property, or safety of Reading Queue, our users, or the public.</p>
        <h4>In a business transfer</h4>
        <p>If Reading Queue is acquired or merged, your information may be transferred as part of that transaction. We will notify you before this occurs.</p>
      </>
    ),
  },
  {
    title: "Data Retention, Cookies & Your Rights",
    content: (
      <>
        <h3>5. Data Retention</h3>
        <p>We retain your personal information for as long as your account is active or as needed to provide the Services. If you delete your account, we will remove your personal data from our active systems within a reasonable period, though copies may remain in encrypted backups for up to 90 days before being purged. Some information may be retained longer where required by law or for legitimate business purposes such as fraud prevention.</p>

        <h3>6. Cookies</h3>
        <p>Reading Queue uses cookies and similar technologies to keep you logged in, remember your preferences (such as light/dark mode), and understand how the platform is used. You can control cookies through your browser settings, but disabling them may affect functionality.</p>
        <p>We do not use third-party advertising cookies or sell data to ad networks.</p>

        <h3>7. Your Rights and Choices</h3>
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
          <li><strong>Correction:</strong> ask us to update inaccurate or incomplete information</li>
          <li><strong>Deletion:</strong> request that we delete your account and associated data</li>
          <li><strong>Portability:</strong> request your data in a structured, machine-readable format</li>
          <li><strong>Objection:</strong> opt out of certain types of processing, including marketing communications</li>
        </ul>
        <p>To exercise any of these rights, contact us at <strong>privacy@readingqueue.app</strong>. We will respond within 30 days.</p>
      </>
    ),
  },
  {
    title: "Security, Children & Contact",
    content: (
      <>
        <h3>8. Children's Privacy</h3>
        <p>Reading Queue is not directed at children under the age of 16. We do not knowingly collect personal information from anyone under 16. If we become aware that we have inadvertently collected such data, we will take steps to delete it promptly.</p>

        <h3>9. Security</h3>
        <p>We implement industry-standard measures to protect your personal information, including encrypted data storage, secure authentication powered by Supabase, and strict access controls. However, no system is completely secure, and we cannot guarantee the absolute security of your data.</p>
        <p>If you believe your account has been compromised, please contact us immediately at <strong>security@readingqueue.app</strong>.</p>

        <h3>10. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. When we make meaningful changes, we will notify you via email or an in-app notice and update the effective date at the top of this page. Your continued use of Reading Queue after changes are posted constitutes your acceptance of the revised policy.</p>

        <h3>11. Contact Us</h3>
        <p>If you have questions or concerns about this Privacy Policy or how we handle your data, please reach out at <strong>privacy@readingqueue.app</strong>.</p>
      </>
    ),
  },
];

export function PrivacyPolicyModal({ onClose }: Props) {
  const [page, setPage] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const total = PAGES.length;
  const isFirst = page === 0;
  const isLast = page === total - 1;

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocusRef.current?.focus();
    };
  }, []);

  const getFocusable = () => {
    const root = dialogRef.current;
    if (!root) return [];
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    );
    return nodes.filter((node) => !node.hasAttribute("disabled") && !node.getAttribute("aria-hidden"));
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowRight" && !isLast) {
      e.preventDefault();
      setPage((p) => p + 1);
      return;
    }
    if (e.key === "ArrowLeft" && !isFirst) {
      e.preventDefault();
      setPage((p) => p - 1);
      return;
    }
    if (e.key === "Tab") {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  return (
    <div className="pp-overlay" role="presentation" onClick={onClose}>
      <div
        className="pp-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="pp-header">
          <div className="pp-header-left">
            <span className="pp-badge">Privacy Policy</span>
            <span className="pp-page-label">{page + 1} / {total}</span>
          </div>
          <button className="pp-close" onClick={onClose} aria-label="Close" ref={closeRef}>✕</button>
        </div>

        {/* Page dots */}
        <div className="pp-dots" aria-hidden="true">
          {PAGES.map((_, i) => (
            <button
              key={i}
              className={`pp-dot${i === page ? " active" : ""}`}
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>

        {/* Title */}
        <div className="pp-title-row">
          <h2 className="pp-title" id={titleId}>{PAGES[page].title}</h2>
        </div>

        {/* Body */}
        <div className="pp-body" ref={bodyRef} id={descId}>
          {PAGES[page].content}
        </div>

        {/* Footer nav */}
        <div className="pp-footer">
          <button
            className="pp-nav-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={isFirst}
          >
            ← Previous
          </button>
          <span className="pp-progress">
            {PAGES.map((_, i) => (
              <span key={i} className={`pp-prog-seg${i <= page ? " done" : ""}`} />
            ))}
          </span>
          {isLast ? (
            <button className="pp-nav-btn pp-nav-done" onClick={onClose}>
              Done ✓
            </button>
          ) : (
            <button className="pp-nav-btn pp-nav-next" onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
