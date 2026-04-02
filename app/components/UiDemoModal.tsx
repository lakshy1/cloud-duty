"use client";

import { AnimatePresence, motion } from "framer-motion";

type UiDemoModalProps = {
  open: boolean;
  mode: "desktop" | "mobile";
  onClose: () => void;
};

export function UiDemoModal({ open, mode, onClose }: UiDemoModalProps) {
  const lines =
    mode === "desktop"
      ? [
          "Hover for auto flip card for 5s",
          "Clicking on any card expands it fully",
        ]
      : [
          "Tap a card to auto flip for 5s",
          "Read more opens the project card fully",
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
                <div className="demo-ui">
                  <div className="demo-sidebar">
                    <span className="demo-dot" />
                    <span className="demo-dot" />
                    <span className="demo-dot" />
                    <span className="demo-dot" />
                  </div>
                  <div className="demo-topbar">
                    <div className="demo-search" />
                    <div className="demo-pill" />
                  </div>
                  <div className="demo-feed">
                    <motion.div
                      className="demo-card demo-card--a"
                      animate={{ rotateY: [0, 180, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="demo-card-face">Front</div>
                      <div className="demo-card-face back">Back</div>
                    </motion.div>
                    <motion.div
                      className="demo-card demo-card--b"
                      animate={{ rotateY: [0, 180, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    >
                      <div className="demo-card-face">Front</div>
                      <div className="demo-card-face back">Back</div>
                    </motion.div>
                    <motion.div
                      className="demo-card demo-card--c"
                      animate={{ rotateY: [0, 180, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                    >
                      <div className="demo-card-face">Front</div>
                      <div className="demo-card-face back">Back</div>
                    </motion.div>
                  </div>
                </div>

                <motion.div
                  className="demo-expand"
                  animate={{ scale: [0.8, 1, 0.8], opacity: [0, 1, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                >
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
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
