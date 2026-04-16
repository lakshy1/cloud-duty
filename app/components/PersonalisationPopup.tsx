"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

type Method = "manual" | "resume" | "linkedin";
type Step =
  | "method"     // pick how to personalise (non-LinkedIn login)
  | "manual"     // type / paste keywords
  | "resume"     // paste resume text
  | "linkedin"   // enter LinkedIn URL
  | "fetching"   // AI extracting keywords
  | "confirm"    // review + edit keywords
  | "animating"; // feed building animation

interface Props {
  /** true when the user logged in via LinkedIn OIDC */
  isLinkedInLogin: boolean;
  /** called when animation ends — hides popup */
  onComplete: (keywords: string[]) => void;
}

/* ─── tiny keyword-pill input ──────────────────────────────────── */
function KeywordInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      className="pers-kw-input"
      type="text"
      placeholder='Type a keyword and press Enter or ","'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Pill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="pers-pill">
      {label}
      <button
        type="button"
        className="pers-pill-x"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
}

/* ─── feed-building animation ──────────────────────────────────── */
function FeedAnimation({
  keywords,
  onDone,
}: {
  keywords: string[];
  onDone: () => void;
}) {
  const [visible, setVisible] = useState<string[]>([]);
  const [fading, setFading] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (idx.current < keywords.length) {
        setVisible((prev) => [...prev, keywords[idx.current]]);
        idx.current++;
      } else {
        clearInterval(interval);
        // Fade out after all keywords shown
        setTimeout(() => {
          setFading(true);
          setTimeout(onDone, 700);
        }, 900);
      }
    }, 280);
    return () => clearInterval(interval);
  }, [keywords, onDone]);

  return (
    <div className={`pers-anim-overlay${fading ? " fading" : ""}`}>
      <div className="pers-anim-inner">
        <div className="pers-anim-spinner" aria-hidden="true">
          <svg viewBox="0 0 50 50" width="48" height="48">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="80 40" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <h2 className="pers-anim-title">Building your personalised feed…</h2>
        <div className="pers-anim-pills" aria-live="polite">
          {visible.map((kw, i) => (
            <span key={i} className="pers-anim-pill">
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function PersonalisationPopup({ isLinkedInLogin, onComplete }: Props) {
  const supabase = getSupabaseBrowserClient();

  const [step, setStep] = useState<Step>(isLinkedInLogin ? "linkedin" : "method");
  const [method, setMethod] = useState<Method | null>(isLinkedInLogin ? "linkedin" : null);

  // Manual keyword entry
  const [inputVal, setInputVal] = useState("");
  const [manualKeywords, setManualKeywords] = useState<string[]>([]);

  // Resume
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // LinkedIn URL
  const [linkedInUrl, setLinkedInUrl] = useState("");

  // Fetching / confirm
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmedKeywords, setConfirmedKeywords] = useState<string[]>([]);
  const [confirmInput, setConfirmInput] = useState("");

  // Saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ── helpers ─────────────────────────────────────────────────── */
  const addKeyword = (kw: string, list: string[], setList: (v: string[]) => void) => {
    const clean = kw.trim().toLowerCase().replace(/,/g, "");
    if (!clean || list.includes(clean) || list.length >= 10) return;
    setList([...list, clean]);
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(inputVal, manualKeywords, setManualKeywords);
      setInputVal("");
    }
  };

  const handleConfirmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(confirmInput, confirmedKeywords, setConfirmedKeywords);
      setConfirmInput("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.info("[personalisation] resume upload started", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    setResumeParseError(null);
    setResumeFileName(file.name);
    setResumeParsing(true);
    setResumeText("");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        console.error("[personalisation] resume parsing failed", {
          status: res.status,
          error: data.error,
          fileName: file.name,
        });
        throw new Error(data.error ?? "Could not extract text from file");
      }
      console.info("[personalisation] resume parsing succeeded", {
        fileName: file.name,
        extractedLength: data.text.length,
      });
      setResumeText(data.text);
    } catch (err) {
      console.error("[personalisation] resume upload flow error", err);
      setResumeParseError(err instanceof Error ? err.message : "File parsing failed");
      setResumeFileName("");
    } finally {
      setResumeParsing(false);
      // reset input so same file can be re-uploaded
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ── fetch keywords from API ─────────────────────────────────── */
  const fetchKeywords = async (type: "linkedin_url" | "text", content: string) => {
    setStep("fetching");
    setFetchError(null);
    console.info("[personalisation] keyword extraction started", {
      type,
      contentLength: content.length,
    });
    try {
      const res = await fetch("/api/extract-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });
      const data = (await res.json()) as { keywords?: string[]; error?: string };
      if (!res.ok || !data.keywords?.length) {
        console.error("[personalisation] keyword extraction failed", {
          status: res.status,
          error: data.error,
          type,
        });
        throw new Error(data.error ?? "No keywords returned");
      }
      console.info("[personalisation] keyword extraction succeeded", {
        type,
        keywordCount: data.keywords.length,
      });
      setConfirmedKeywords(data.keywords);
      setStep("confirm");
    } catch (err) {
      console.error("[personalisation] keyword extraction flow error", err);
      setFetchError(err instanceof Error ? err.message : "Extraction failed");
      setStep(method === "linkedin" ? "linkedin" : "resume");
    }
  };

  /* ── save to Supabase + start animation ─────────────────────── */
  const handleSave = async () => {
    const toSave = confirmedKeywords.length > 0 ? confirmedKeywords : manualKeywords;
    if (toSave.length === 0) return;
    console.info("[personalisation] save started", {
      keywordCount: toSave.length,
      source: confirmedKeywords.length > 0 ? "confirmed" : "manual",
    });
    setSaving(true);
    setSaveError(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.updateUser({
      data: {
        interests: toSave,
        personalisation_complete: true,
      },
    });

    if (error) {
      console.error("[personalisation] save failed", error);
      setSaving(false);
      setSaveError(error.message ?? "Unable to save your interests");
      return;
    }

    // Persist in localStorage so a fast page-reload can't show the popup again
    // before the server-side metadata propagates.
    if (user?.id) {
      localStorage.setItem(`cd_pers_done_${user.id}`, "1");
    }

    console.info("[personalisation] save succeeded", {
      userId: user?.id ?? null,
      keywordCount: toSave.length,
    });
    setSaving(false);
    setStep("animating");
  };

  /* ─────────────────────────────────────────────────────────────── */
  // Animation done → tell parent
  const handleAnimDone = () => {
    const kws = confirmedKeywords.length > 0 ? confirmedKeywords : manualKeywords;
    onComplete(kws);
  };

  if (step === "animating") {
    const kws = confirmedKeywords.length > 0 ? confirmedKeywords : manualKeywords;
    return <FeedAnimation keywords={kws} onDone={handleAnimDone} />;
  }

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="pers-overlay" role="dialog" aria-modal="true">
      <div className="pers-card">

        {/* ── METHOD SELECTION ───────────────────────────────────── */}
        {step === "method" && (
          <>
            <div className="pers-head">
              <div className="pers-icon" aria-hidden="true">✦</div>
              <h2 className="pers-title">Personalise your feed</h2>
              <p className="pers-sub">
                Choose how you&apos;d like us to find topics you care about.
              </p>
            </div>
            <div className="pers-methods">
              <button
                className="pers-method"
                type="button"
                onClick={() => { setMethod("manual"); setStep("manual"); }}
              >
                <span className="pers-method-icon">✏️</span>
                <span className="pers-method-body">
                  <strong>Pick keywords yourself</strong>
                  <span>Type up to 10 topics you&apos;re interested in</span>
                </span>
              </button>
              <button
                className="pers-method"
                type="button"
                onClick={() => { setMethod("resume"); setStep("resume"); }}
              >
                <span className="pers-method-icon">📄</span>
                <span className="pers-method-body">
                  <strong>Use your resume</strong>
                  <span>Upload or paste your CV — we&apos;ll extract keywords</span>
                </span>
              </button>
              <button
                className="pers-method"
                type="button"
                onClick={() => { setMethod("linkedin"); setStep("linkedin"); }}
              >
                <span className="pers-method-icon">🔗</span>
                <span className="pers-method-body">
                  <strong>Use LinkedIn profile</strong>
                  <span>Paste your profile URL — we&apos;ll auto-fetch interests</span>
                </span>
              </button>
            </div>
          </>
        )}

        {/* ── MANUAL KEYWORDS ────────────────────────────────────── */}
        {step === "manual" && (
          <>
            <div className="pers-head">
              <button className="pers-back" type="button" onClick={() => setStep("method")}>← Back</button>
              <h2 className="pers-title">Pick your interests</h2>
              <p className="pers-sub">Add up to 10 keywords (press Enter or comma to add each one)</p>
            </div>
            <div className="pers-pill-area">
              {manualKeywords.map((kw) => (
                <Pill
                  key={kw}
                  label={kw}
                  onRemove={() => setManualKeywords(manualKeywords.filter((k) => k !== kw))}
                />
              ))}
            </div>
            {manualKeywords.length < 10 && (
              <KeywordInput
                value={inputVal}
                onChange={setInputVal}
              />
            )}
            <p className="pers-count">{manualKeywords.length}/10 keywords added</p>
            <button
              className="pers-primary"
              type="button"
              disabled={manualKeywords.length < 1}
              onClick={() => { setConfirmedKeywords(manualKeywords); setStep("confirm"); }}
            >
              Continue
            </button>
          </>
        )}

        {/* ── RESUME ─────────────────────────────────────────────── */}
        {step === "resume" && (
          <>
            <div className="pers-head">
              <button className="pers-back" type="button" onClick={() => setStep("method")}>← Back</button>
              <h2 className="pers-title">Add your resume</h2>
              <p className="pers-sub">Upload your resume (PDF or TXT) — or paste your text below</p>
            </div>

            {/* Upload area */}
            <div
              className="pers-dropzone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file && fileRef.current) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileRef.current.files = dt.files;
                  await handleFileUpload({ target: fileRef.current } as React.ChangeEvent<HTMLInputElement>);
                }
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              {resumeParsing ? (
                <div className="pers-dropzone-inner">
                  <svg className="pers-dz-spin" viewBox="0 0 50 50" width="28" height="28">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="80 40" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                  <span>Reading {resumeFileName}…</span>
                </div>
              ) : resumeFileName && resumeText ? (
                <div className="pers-dropzone-inner pers-dropzone-inner--ok">
                  <span className="pers-dz-check">✓</span>
                  <span>{resumeFileName}</span>
                  <span className="pers-dz-change">Click to change</span>
                </div>
              ) : (
                <div className="pers-dropzone-inner">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span><strong>Click to upload</strong> or drag &amp; drop</span>
                  <span className="pers-dz-types">PDF or TXT · max 5 MB</span>
                </div>
              )}
            </div>

            {resumeParseError && <p className="pers-error">{resumeParseError}</p>}

            <div className="pers-resume-or">
              <span>or paste resume text</span>
            </div>

            <textarea
              className="pers-textarea"
              placeholder="Paste your resume, LinkedIn summary, or bio here…"
              value={resumeText}
              onChange={(e) => { setResumeText(e.target.value); setResumeFileName(""); }}
              rows={5}
            />

            {fetchError && <p className="pers-error">{fetchError}</p>}
            <button
              className="pers-primary"
              type="button"
              disabled={!resumeText.trim() || resumeParsing}
              onClick={() => fetchKeywords("text", resumeText)}
            >
              Extract keywords
            </button>
          </>
        )}

        {/* ── LINKEDIN URL ───────────────────────────────────────── */}
        {step === "linkedin" && (
          <>
            <div className="pers-head">
              {!isLinkedInLogin && (
                <button className="pers-back" type="button" onClick={() => setStep("method")}>← Back</button>
              )}
              {isLinkedInLogin ? (
                <>
                  <div className="pers-icon" aria-hidden="true">👋</div>
                  <h2 className="pers-title">Welcome! Let&apos;s set up your feed</h2>
                  <p className="pers-sub">
                    You signed in with LinkedIn. Paste your profile URL and we&apos;ll auto-fetch your professional interests.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="pers-title">Your LinkedIn profile</h2>
                  <p className="pers-sub">Paste your public LinkedIn profile URL</p>
                </>
              )}
            </div>
            <label className="pers-label">
              LinkedIn URL
              <input
                className="pers-input"
                type="url"
                placeholder="https://linkedin.com/in/your-username"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
              />
            </label>
            {fetchError && <p className="pers-error">{fetchError}</p>}
            <button
              className="pers-primary"
              type="button"
              disabled={!linkedInUrl.trim() || !linkedInUrl.includes("linkedin.com")}
              onClick={() => fetchKeywords("linkedin_url", linkedInUrl)}
            >
              Fetch my interests
            </button>
          </>
        )}

        {/* ── FETCHING ───────────────────────────────────────────── */}
        {step === "fetching" && (
          <div className="pers-fetching">
            <div className="pers-fetch-spinner" aria-hidden="true">
              <svg viewBox="0 0 50 50" width="40" height="40">
                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="80 40" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            <p className="pers-fetch-text">Analysing your profile…</p>
            <p className="pers-fetch-sub">This takes a few seconds</p>
          </div>
        )}

        {/* ── CONFIRM KEYWORDS ───────────────────────────────────── */}
        {step === "confirm" && (
          <>
            <div className="pers-head">
              <div className="pers-icon pers-icon--green" aria-hidden="true">✓</div>
              <h2 className="pers-title">Your interest keywords</h2>
              <p className="pers-sub">
                Remove any that don&apos;t fit, or add more. These shape what you see in your feed.
              </p>
            </div>
            <div className="pers-pill-area">
              {confirmedKeywords.map((kw) => (
                <Pill
                  key={kw}
                  label={kw}
                  onRemove={() => setConfirmedKeywords(confirmedKeywords.filter((k) => k !== kw))}
                />
              ))}
            </div>
            {confirmedKeywords.length < 10 && (
              <input
                className="pers-kw-input"
                type="text"
                placeholder="Add another keyword…"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                onKeyDown={handleConfirmKeyDown}
              />
            )}
            <p className="pers-count">{confirmedKeywords.length}/10 keywords</p>
            {saveError && <p className="pers-error">{saveError}</p>}
            <button
              className="pers-primary"
              type="button"
              disabled={confirmedKeywords.length < 1 || saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Personalise my feed ✦"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
