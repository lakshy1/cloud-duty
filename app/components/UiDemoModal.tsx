"use client";

import { AnimatePresence, motion } from "framer-motion";

type UiDemoModalProps = {
  open: boolean;
  mode: "desktop" | "mobile";
  onClose: () => void;
};

export function UiDemoModal({ open, mode, onClose }: UiDemoModalProps) {
  const isMobile = mode === "mobile";
  const lines = isMobile
    ? [
        "Tap a card to preview it for 5 seconds.",
        "Tap Read more to open the full project card.",
      ]
    : [
        "Hover a card to preview it for 5 seconds.",
        "Click any card to open the full project view.",
      ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="demo-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="demo-panel"
            initial={{ y: 18, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demoTitle"
          >
            <div className="demo-head">
              <div>
                <div className="demo-kicker">UI Demo</div>
                <h2 className="demo-title" id="demoTitle">
                  Get to know the feed
                </h2>
              </div>
              <button className="demo-close" type="button" onClick={onClose} aria-label="Close demo">
                x
              </button>
            </div>

            <div className="demo-body">
              <div className="demo-copy">
                {lines.map((text) => (
                  <div className="demo-line" key={text}>
                    <span className="demo-bullet" aria-hidden="true" />
                    <span>{text}</span>
                  </div>
                ))}
                <div className="demo-legend">
                  <div className="demo-chip">Home feed</div>
                  <div className="demo-chip">Flip cards</div>
                  <div className="demo-chip">Popup expand</div>
                </div>
              </div>

              <div className="demo-stage">
                <div className="demo-seq">
                  <div className="demo-step">
                    <div className="demo-step-label">Step 1</div>
                    <div className="demo-mini">
                      <div className="demo-mini-card demo-mini-card--flip">
                        <div className="demo-mini-face">Front</div>
                        <div className="demo-mini-face back">Back</div>
                      </div>
                      <div className="demo-pulse" />
                      <div className="demo-gesture">{isMobile ? "Tap" : "Hover"}</div>
                    </div>
                  </div>

                  <div className="demo-step">
                    <div className="demo-step-label">Step 2</div>
                    <div className="demo-mini demo-mini--expand">
                      <div className="demo-mini-grid">
                        <div className="demo-mini-card demo-mini-card--b" />
                        <div className="demo-mini-card demo-mini-card--c" />
                      </div>
                      {isMobile ? (
                        <div className="demo-readmore">
                          Read more
                        </div>
                      ) : (
                        <div className="demo-click">
                          Click
                        </div>
                      )}
                      <div className="demo-expand-card">
                        <div className="demo-expand-head">
                          <div className="demo-avatar" />
                          <div className="demo-title-bar" />
                        </div>
                        <div className="demo-expand-body" />
                        <div className="demo-expand-actions">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
