"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CardData } from "../data/card-data";

type CardItemProps = {
  data: CardData;
  index: number;
  highlightQuery?: string;
  saved: boolean;
  onToggleSave?: (postId: string) => void;
  liked: boolean;
  disliked: boolean;
  onToggleReaction?: (postId: string, reaction: "like" | "dislike") => void;
  onOpenPopup: (index: number, rect: DOMRect) => void;
  onOpenReport: (index: number) => void;
};

const FLIP_DELAY = 5000;
const ARC_CIRC = 62.83;

export function CardItem({
  data,
  index,
  highlightQuery,
  saved,
  onToggleSave,
  liked,
  disliked,
  onToggleReaction,
  onOpenPopup,
  onOpenReport,
}: CardItemProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<HTMLDivElement | null>(null);
  const arcRef = useRef<SVGCircleElement | null>(null);
  const bArcRef = useRef<SVGCircleElement | null>(null);
  const bTimerSvgRef = useRef<SVGSVGElement | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const isFlippedRef = useRef(false);

  const [isFlipped, setIsFlipped] = useState(false);
  const [savePop, setSavePop] = useState(false);
  const [likePop, setLikePop] = useState(false);
  const [dislikePop, setDislikePop] = useState(false);

  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);

  const isMobileWidth = useCallback(() => window.innerWidth <= 580, []);

  const cancelTimers = useCallback(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const resetArc = useCallback(() => {
    if (arcRef.current) arcRef.current.style.strokeDashoffset = "0";
    if (bArcRef.current) bArcRef.current.style.strokeDashoffset = "0";
  }, []);

  const hideTimer = useCallback(() => {
    if (timerRef.current) timerRef.current.style.opacity = "0";
    if (bTimerSvgRef.current) bTimerSvgRef.current.style.opacity = "0";
  }, []);

  const showTimer = useCallback(() => {
    if (isFlippedRef.current) {
      if (timerRef.current) timerRef.current.style.opacity = "0";
      if (bTimerSvgRef.current) bTimerSvgRef.current.style.opacity = "1";
    } else {
      if (timerRef.current) timerRef.current.style.opacity = "1";
      if (bTimerSvgRef.current) bTimerSvgRef.current.style.opacity = "0";
    }
  }, []);

  const startCountdown = useCallback(
    (onComplete?: () => void) => {
      cancelTimers();
      const startTs = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - startTs) / FLIP_DELAY, 1);
        if (arcRef.current) arcRef.current.style.strokeDashoffset = `${p * ARC_CIRC}`;
        if (bArcRef.current) bArcRef.current.style.strokeDashoffset = `${p * ARC_CIRC}`;
        if (p < 1) {
          rafIdRef.current = requestAnimationFrame(tick);
          return;
        }
      };
      rafIdRef.current = requestAnimationFrame(tick);
      autoTimerRef.current = window.setTimeout(() => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        if (arcRef.current) arcRef.current.style.strokeDashoffset = `${ARC_CIRC}`;
        if (bArcRef.current) bArcRef.current.style.strokeDashoffset = `${ARC_CIRC}`;
        if (onComplete) onComplete();
        window.setTimeout(() => {
          hideTimer();
          resetArc();
        }, 650);
      }, FLIP_DELAY);
    },
    [cancelTimers, hideTimer, resetArc]
  );

  const doFlip = useCallback(() => {
    isFlippedRef.current = true;
    setIsFlipped(true);
    resetArc();
    showTimer();
  }, [resetArc, showTimer]);

  const doUnflip = useCallback(() => {
    isFlippedRef.current = false;
    setIsFlipped(false);
    cancelTimers();
    hideTimer();
    resetArc();
  }, [cancelTimers, hideTimer, resetArc]);

  const handleMouseEnter = useCallback(() => {
    if (isMobileWidth()) return;
    if (isFlippedRef.current) return;
    doFlip();
    startCountdown(() => {
      setIsFlipped(false);
    });
  }, [doFlip, isMobileWidth, startCountdown]);

  const handleMouseLeave = useCallback(() => {
    if (isMobileWidth()) return;
    doUnflip();
  }, [doUnflip, isMobileWidth]);

  const handleCardClick = useCallback(() => {
    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    if (!isMobileWidth()) {
      onOpenPopup(index, cardRect);
      return;
    }
    if (isFlippedRef.current) {
      doUnflip();
      return;
    }
    doFlip();
    startCountdown(() => {
      setIsFlipped(false);
    });
  }, [doFlip, doUnflip, index, isMobileWidth, onOpenPopup, startCountdown]);

  const handleSave = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!saved) setSavePop(true);
      if (data.id && onToggleSave) {
        onToggleSave(data.id);
      }
    },
    [data.id, onToggleSave, saved]
  );

  const handleLike = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!liked) setLikePop(true);
      if (data.id && onToggleReaction) {
        onToggleReaction(data.id, "like");
      }
    },
    [data.id, liked, onToggleReaction]
  );

  const handleDislike = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!disliked) setDislikePop(true);
      if (data.id && onToggleReaction) {
        onToggleReaction(data.id, "dislike");
      }
    },
    [data.id, disliked, onToggleReaction]
  );

  const handleReport = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onOpenReport(index);
    },
    [index, onOpenReport]
  );

  useEffect(() => {
    return () => {
      cancelTimers();
    };
  }, [cancelTimers]);

  const renderHighlight = useCallback((text: string) => {
    const query = highlightQuery?.trim();
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "ig");
    const matches = text.match(regex);
    if (!matches) return text;
    const parts = text.split(regex);
    const nodes: Array<string | JSX.Element> = [];
    parts.forEach((part, index) => {
      if (part) nodes.push(part);
      const match = matches[index];
      if (match) {
        nodes.push(
          <mark className="search-hit" key={`${match}-${index}`}>
            {match}
          </mark>
        );
      }
    });
    return nodes;
  }, [highlightQuery]);

  const summaryText =
    data.summary.length > 80 ? `${data.summary.substring(0, 80)}...` : data.summary;
  const VerifiedBadge = () =>
    data.verified ? (
      <span className="handle-verified" aria-label="Verified">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M8.5 12.5l2.2 2.2L15.8 9.5" />
        </svg>
      </span>
    ) : null;

  return (
    <div className="cw" key={data.title}>
      <div
        className="card"
        data-index={index}
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        <div className="card-timer" ref={timerRef}>
          <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <circle className="timer-track" cx="14" cy="14" r="12" />
            <line className="timer-hand-h" x1="14" y1="14" x2="14" y2="9" />
            <line className="timer-hand-m" x1="14" y1="14" x2="18" y2="14" />
            <circle className="timer-arc" ref={arcRef} cx="14" cy="14" r="10" />
          </svg>
        </div>
        <div className={`card-inner${isFlipped ? " flipped" : ""}`} id={`ci-${index}`} ref={innerRef}>
          <div className="card-front">
            <Image
              className="card-img"
              src={data.img}
              alt={data.title}
              fill
              sizes="(max-width: 580px) 100vw, (max-width: 1040px) 33vw, 20vw"
            />
            <button
              className={`card-save${saved ? " saved" : ""}${savePop ? " popping" : ""}`}
              title={saved ? "Unsave" : "Save to board"}
              onClick={handleSave}
              onAnimationEnd={() => setSavePop(false)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>

            <div className="card-actions" onClick={(event) => event.stopPropagation()}>
              <button
                className={`ca-btn ca-like${liked ? " active" : ""}${likePop ? " pop" : ""}`}
                title="Like"
                onClick={handleLike}
                onAnimationEnd={() => setLikePop(false)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
              <button
                className={`ca-btn ca-dislike${disliked ? " active" : ""}${dislikePop ? " pop" : ""}`}
                title="Dislike"
                onClick={handleDislike}
                onAnimationEnd={() => setDislikePop(false)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                  <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
              </button>
              <button
                className="ca-btn ca-report"
                title="Report"
                onClick={handleReport}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </button>
            </div>

            <div className="card-foot">
              <div className="u-row">
                <Image className="u-ava" src={data.ava} alt={data.author} width={28} height={28} />
                <span className="u-name">
                  {renderHighlight(data.handle)}
                  <VerifiedBadge />
                </span>
              </div>
            </div>

            <div className="card-summary">
              <div className="card-summary-title">{renderHighlight(data.title)}</div>
              <div className="card-summary-desc">{renderHighlight(summaryText)}</div>
              <div className="card-summary-handle">
                <Image
                  className="card-summary-ava"
                  src={data.ava}
                  alt={data.author}
                  width={20}
                  height={20}
                />
                {renderHighlight(data.handle)}
                <VerifiedBadge />
              </div>
            </div>
          </div>

          <div className="card-back">
            <div className="b-author">
              <Image className="b-ava" src={data.ava} alt={data.author} width={32} height={32} />
              <div className="b-author-info">
                <div className="b-author-name">{renderHighlight(data.author)}</div>
                <div className="b-author-handle">
                  {renderHighlight(data.handle)}
                  <VerifiedBadge />
                </div>
              </div>
              <div className="b-timer-slot">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  style={{ opacity: 0, transition: "opacity .22s" }}
                  className="b-timer-svg"
                  ref={bTimerSvgRef}
                >
                  <circle className="timer-track" cx="14" cy="14" r="12" />
                  <line className="timer-hand-h" x1="14" y1="14" x2="14" y2="9" />
                  <line className="timer-hand-m" x1="14" y1="14" x2="18" y2="14" />
                  <circle
                    className="b-arc"
                    ref={bArcRef}
                    cx="14"
                    cy="14"
                    r="10"
                    fill="none"
                    stroke="var(--flip-bar)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="62.83 62.83"
                    strokeDashoffset="0"
                    transform="rotate(-90 14 14)"
                    style={{ filter: "drop-shadow(0 0 3px var(--flip-bar))" }}
                  />
                </svg>
              </div>
            </div>
            <div className="b-image">
              <Image src={data.img} alt={data.title} fill sizes="(max-width: 580px) 100vw, 35vw" />
            </div>
            <div className="b-sep" />
            <div className="b-title">{renderHighlight(data.title)}</div>
            <div className="b-desc">{renderHighlight(data.details)}</div>
            <div className="b-stats">
              <div className="b-stat">
                <div className="b-stat-val">{data.views}</div>
                <div className="b-stat-lbl">Impressions</div>
              </div>
              <div className="b-stat">
                <div className="b-stat-val">{data.likes}</div>
                <div className="b-stat-lbl">Likes</div>
              </div>
            </div>
            <button
              className="b-read-more"
              onClick={(event) => {
                event.stopPropagation();
                const rect = cardRef.current?.getBoundingClientRect();
                if (rect) onOpenPopup(index, rect);
              }}
            >
              Read More {"->"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
