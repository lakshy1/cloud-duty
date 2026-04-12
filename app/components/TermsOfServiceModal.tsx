"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

type Props = { onClose: () => void };

const PAGES = [
  {
    title: "Terms of Service",
    content: (
      <>
        <p className="pp-meta">Effective Date: April 12, 2026 · Reading Queue</p>
        <p>Please read these Terms carefully before using Reading Queue. By accessing or using the platform, you agree to be bound by these Terms.</p>

        <h3>1. About Reading Queue</h3>
        <p>Reading Queue is a social platform built for developers to share projects, write posts, discover content, and collaborate with others. Reading Queue provides portfolio-style developer profiles, AI-powered post tools, real-time messaging, and a curated feed — available as both a web app and Android application.</p>
        <p>These Terms of Service ("Terms") govern your access to and use of Reading Queue&apos;s website, mobile applications, and related services (collectively, the "Services"). By creating an account or using the Services in any way, you agree to these Terms.</p>
      </>
    ),
  },
  {
    title: "Eligibility & Your Account",
    content: (
      <>
        <h3>2. Eligibility</h3>
        <p>You must be at least 16 years old to use Reading Queue. By using the Services, you represent and warrant that you meet this age requirement and that you have the legal capacity to enter into a binding agreement.</p>
        <p>If you are using the Services on behalf of an organization, you represent that you are authorized to bind that organization to these Terms.</p>

        <h3>3. Your Account</h3>
        <p>To access most features, you must create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You may not transfer your account to another person without our prior written consent.</p>
        <p>You agree to provide accurate and complete information when registering and to keep your account information up to date. Reading Queue reserves the right to suspend or terminate accounts that contain false, misleading, or outdated information.</p>
        <p>You may not create an account using someone else&apos;s name with the intent to impersonate them. Reading Queue may refuse registration or cancel any account at its discretion.</p>
      </>
    ),
  },
  {
    title: "Your Content",
    content: (
      <>
        <h3>4. Content You Post</h3>
        <h4>Your ownership</h4>
        <p>You own the content you create and publish on Reading Queue. We do not claim ownership of your posts, projects, profile content, or any other material you submit to the platform. Your content is yours.</p>
        <h4>License to Reading Queue</h4>
        <p>By posting content on Reading Queue, you grant us a non-exclusive, royalty-free, worldwide license to display, distribute, and promote your content within the platform and in connection with our Services. This license exists solely to operate and improve Reading Queue and does not give us the right to sell your content to third parties.</p>
        <h4>Content standards</h4>
        <p>You agree not to post content that:</p>
        <ul>
          <li>Infringes any copyright, trademark, patent, or other intellectual property right</li>
          <li>Is defamatory, threatening, harassing, abusive, or hateful toward any individual or group</li>
          <li>Contains spam, malicious code, exploits, or unauthorized advertising</li>
          <li>Violates any applicable local, national, or international law or regulation</li>
          <li>Impersonates any person or entity, or misrepresents your affiliation with any person or entity</li>
          <li>Is harmful to minors in any way</li>
        </ul>
        <p>Reading Queue reserves the right to remove any content that violates these standards, with or without notice.</p>
      </>
    ),
  },
  {
    title: "AI, Messaging & Prohibited Use",
    content: (
      <>
        <h3>5. AI-Powered Features</h3>
        <p>Reading Queue offers AI-assisted tools — including post generation, text enhancement, and an AI Support Chatbot — powered by the Groq API. These features are designed to help you create content more efficiently. You are solely responsible for reviewing and taking ownership of any AI-generated content before publishing it.</p>
        <p>AI-generated output is provided as a starting point, not a finished product. We make no warranties about the accuracy, originality, or quality of AI-generated content.</p>

        <h3>6. Messaging and Real-Time Features</h3>
        <p>Reading Queue includes direct messaging between mutually-connected users. You agree not to use the messaging system to send spam, unsolicited promotions, harassment, or any content that violates these Terms. We may access message contents in limited circumstances — such as to enforce our Terms, ensure platform security, provide user support, or as required by law.</p>

        <h3>7. Prohibited Uses</h3>
        <p>You agree not to use Reading Queue to:</p>
        <ul>
          <li>Scrape, crawl, or systematically harvest data from the platform without our written permission</li>
          <li>Reverse-engineer, decompile, or attempt to extract the source code of our Services</li>
          <li>Use automated scripts or bots to interact with the platform in unauthorized ways</li>
          <li>Circumvent any access controls, security features, or rate limits</li>
          <li>Conduct any activity that could damage, disrupt, or overburden our infrastructure</li>
          <li>Collect other users&apos; personal information without their consent</li>
        </ul>
      </>
    ),
  },
  {
    title: "Third-Party & Legal",
    content: (
      <>
        <h3>8. Third-Party Services</h3>
        <p>Reading Queue integrates with third-party services including Groq API (AI features) and Supabase (infrastructure). Your use of these integrations may be subject to those third parties&apos; own terms of service and privacy policies. We are not responsible for the content, practices, or policies of third-party services.</p>

        <h3>9. Termination</h3>
        <p>You may delete your account at any time through your account settings. Upon deletion, your public profile and posts will be removed from the platform, though copies may persist in backups for a limited time.</p>
        <p>Reading Queue reserves the right to suspend or terminate your access to the Services at any time, with or without notice, if you violate these Terms or engage in conduct we determine to be harmful to other users or the platform.</p>

        <h3>10. Disclaimers</h3>
        <p>Reading Queue is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the reliability, accuracy, or fitness for a particular purpose of the Services. We do not guarantee uninterrupted access to the platform.</p>

        <h3>11. Limitation of Liability</h3>
        <p>To the fullest extent permitted by applicable law, Reading Queue and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Services, even if we have been advised of the possibility of such damages.</p>

        <h3>12. Changes to These Terms</h3>
        <p>We may update these Terms from time to time. When we do, we will update the effective date at the top of this page and, where appropriate, notify you via email or an in-app notice. Your continued use of Reading Queue after changes are posted constitutes your acceptance of the updated Terms.</p>

        <h3>13. Contact</h3>
        <p>If you have questions about these Terms, you can reach us at <strong>legal@readingqueue.app</strong>.</p>
      </>
    ),
  },
];

export function TermsOfServiceModal({ onClose }: Props) {
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
            <span className="pp-badge">Terms of Service</span>
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
