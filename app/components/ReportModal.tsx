"use client";

import { RefObject } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

type ReportStatus = "" | "submitting" | "success" | "error";

type ReportModalProps = {
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  selectedReason: string | null;
  text: string;
  status: ReportStatus;
  statusMessage: string;
  submitting: boolean;
  onClose: () => void;
  onSelectReason: (reason: string) => void;
  onTextChange: (next: string) => void;
  onSubmit: () => void;
};

const reasons = ["Spam", "Misleading", "Hateful content", "Violence", "Copyright", "Other"];

export function ReportModal({
  open,
  panelRef,
  selectedReason,
  text,
  status,
  statusMessage,
  submitting,
  onClose,
  onSelectReason,
  onTextChange,
  onSubmit,
}: ReportModalProps) {
  useFocusTrap(panelRef, open, { onEscape: onClose });

  return (
    <div
      className={`report-overlay${open ? " open" : ""}`}
      id="reportOverlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-hidden={!open}
    >
      <div className="report-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="reportTitle" aria-describedby="reportSubtitle" tabIndex={-1}>
        <div className="report-header">
          <div className="report-title" id="reportTitle">
            Report Post
          </div>
          <button className="report-close" onClick={onClose} aria-label="Close report dialog">
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="report-subtitle" id="reportSubtitle">
          Help us understand what's wrong with this post. Your report is confidential.
        </div>

        <div className="report-reasons">
          {reasons.map((label) => (
            <button
              key={label}
              className={`report-reason${selectedReason === label ? " selected" : ""}`}
              onClick={() => onSelectReason(label)}
              aria-pressed={selectedReason === label}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          className="report-textarea"
          id="reportText"
          placeholder="Describe the issue in more detail (optional)..."
          maxLength={500}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
        />

        <div
          className={`report-status${status ? ` show ${status}` : ""}`}
          id="reportStatus"
          role="status"
          aria-live="polite"
        >
          <svg id="reportStatusIcon" viewBox="0 0 24 24">
            {status === "submitting" ? (
              <circle
                cx="12"
                cy="12"
                r="10"
                strokeDasharray="31.4"
                strokeDashoffset="10"
                style={{ animation: "spin 1s linear infinite", transformOrigin: "center" }}
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            ) : null}
            {status === "success" ? (
              <>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </>
            ) : null}
            {status === "error" ? (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            ) : null}
          </svg>
          <span id="reportStatusText">{statusMessage}</span>
        </div>

        <button
          className="report-submit"
          id="reportSubmit"
          onClick={onSubmit}
          disabled={submitting || status === "success"}
        >
          {submitting ? "Submitting..." : status === "success" ? "Reported" : "Submit Report"}
        </button>
      </div>
    </div>
  );
}
