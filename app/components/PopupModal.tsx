"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { RefObject } from "react";
import type { CardData } from "../data/card-data";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { FollowButton } from "./FollowButton";
import { MarkdownText } from "./MarkdownText";

export type PopupInteractions = {
  like: boolean;
  dislike: boolean;
  save: boolean;
  likePop: boolean;
  dislikePop: boolean;
  saveSweep: boolean;
};

type PopupModalProps = {
  open: boolean;
  data: CardData | null;
  interactions: PopupInteractions;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onReport: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
};

export function PopupModal({
  open,
  data,
  interactions,
  onClose,
  onLike,
  onDislike,
  onSave,
  onReport,
  panelRef,
  overlayRef,
}: PopupModalProps) {
  useFocusTrap(panelRef, open, { onEscape: onClose });
  const router = useRouter();

  const handleViewProfile = () => {
    if (data?.userId) {
      onClose();
      router.push(`/user/${data.userId}`);
    }
  };

  return (
    <>
      <div className="popup-overlay" id="popupOverlay" ref={overlayRef} aria-hidden={!open}>
        <div className="popup-backdrop" id="popupBackdrop" onClick={onClose} />
      </div>
      <div
        className="popup-panel"
        id="popupPanel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ppTitle"
        aria-describedby="ppDesc"
        tabIndex={-1}
      >
        <div className="pp-left">
          <button className="pp-close" id="ppClose" onClick={onClose} aria-label="Close dialog">
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {data ? (
            <Image id="ppImg" src={data.img} alt={data.title} fill sizes="(max-width: 580px) 100vw, 55vw" />
          ) : null}
          {data?.tag ? (
            <div className="pp-tag" id="ppTag">
              {data.tag}
            </div>
          ) : null}
        </div>
        <div className="pp-right">
          <div className="pp-author">
            <div
              className={`pp-author-main${data?.userId ? " pp-author--clickable" : ""}`}
              onClick={data?.userId ? handleViewProfile : undefined}
              role={data?.userId ? "button" : undefined}
              tabIndex={data?.userId ? 0 : undefined}
              onKeyDown={data?.userId ? (e) => e.key === "Enter" && handleViewProfile() : undefined}
              aria-label={data?.userId ? `View ${data.author}'s profile` : undefined}
            >
              {data ? (
                <Image
                  className="pp-ava"
                  id="ppAva"
                  src={data.ava}
                  alt={data.author}
                  width={38}
                  height={38}
                />
              ) : null}
              <div className="pp-author-info">
                <div className="pp-author-name" id="ppAuthorName">
                  {data?.author ?? ""}
                </div>
                <div className="pp-author-handle" id="ppAuthorHandle">
                  {data?.handle ?? ""}
                </div>
              </div>
            </div>
            <FollowButton targetUserId={data?.userId} size="sm" className="pp-author-follow" />
          </div>
          <div className="pp-title" id="ppTitle">
            {data?.title ?? ""}
          </div>
          <div className="pp-line" />
          <div className="pp-desc" id="ppDesc">
            <MarkdownText text={data?.details ?? ""} className="pp-desc-md" />
          </div>

          <div className="pp-stats">
            <div className="pp-stat accent">
              <div className="pp-stat-val" id="ppViews">
                {data?.views ?? ""}
              </div>
              <div className="pp-stat-label">Impressions</div>
            </div>
            <div className="pp-stat">
              <div className="pp-stat-val" id="ppLikes">
                {data?.likes ?? ""}
              </div>
              <div className="pp-stat-label">Likes</div>
            </div>
            <div className="pp-stat">
              <div className="pp-stat-val" id="ppDislikes">
                {data?.dislikes ?? "0"}
              </div>
              <div className="pp-stat-label">Dislikes</div>
            </div>
          </div>

          <div className="pp-interactions">
            <button
              className={`pp-int-btn pp-int-like${interactions.like ? " active" : ""}${
                interactions.likePop ? " pop" : ""
              }`}
              id="ppLikeBtn"
              onClick={onLike}
              title="Like"
            >
              <svg viewBox="0 0 24 24">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span>Like</span>
            </button>
            <button
              className={`pp-int-btn pp-int-dislike${interactions.dislike ? " active" : ""}${
                interactions.dislikePop ? " pop" : ""
              }`}
              id="ppDislikeBtn"
              onClick={onDislike}
              title="Dislike"
            >
              <svg viewBox="0 0 24 24">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
              <span>Dislike</span>
            </button>
            <button
              className={`pp-int-btn pp-int-save${interactions.save ? " active" : ""}${
                interactions.saveSweep ? " sweep" : ""
              }`}
              id="ppSaveBtn"
              onClick={onSave}
              title={interactions.save ? "Saved" : "Save"}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span className="btn-label">{interactions.save ? "Saved" : "Save"}</span>
            </button>
            <button className="pp-int-btn pp-int-report" onClick={onReport} title="Report">
              <svg viewBox="0 0 24 24">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span>Report</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
