"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useUIState } from "../state/ui-state";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { CardData } from "../data/card-data";

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_AVATAR = "https://i.pravatar.cc/64?img=12";
const DEFAULT_TAG = "Project";
const TAG_OPTIONS = ["Project", "Design", "Engineering", "Marketing", "Research", "Product"];

const trimOrEmpty = (value: string) => value.trim();
const normalizeUsername = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const { pushToast, setCreatedPost } = useUIState();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [authorName, setAuthorName] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState(DEFAULT_AVATAR);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerMeta, setBannerMeta] = useState<{ width: number; height: number } | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [cropFrameSize, setCropFrameSize] = useState<{ width: number; height: number } | null>(null);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [tag, setTag] = useState(DEFAULT_TAG);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiDetailsLoading, setAiDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState<{ field: "summary" | "details"; message: string } | null>(
    null
  );
  const aiErrorTimerRef = useRef<number | null>(null);

  useFocusTrap(panelRef, open, { onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    setError("");
    setAiError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadIdentity = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user || !active) return;
        setAuthorId(user.id);

        const meta = user.user_metadata ?? {};
        const fullName =
          meta.full_name ||
          [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
          "User";

        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        const rawUsername =
          profile?.username ||
          meta.username ||
          meta.preferred_username ||
          meta.user_name ||
          fullName ||
          "user";
        const normalized = normalizeUsername(rawUsername) || "user";
        if (!profile?.username) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            user_id: user.id,
            username: normalized,
            full_name: fullName || null,
            avatar_url: profile?.avatar_url || meta.avatar_url || null,
          });
          if (profileError) {
            // Ignore profile upsert issues; we'll still use the normalized handle locally.
          }
        }
        const handle = normalized.startsWith("@") ? normalized : `@${normalized}`;
        const name = profile?.full_name || fullName || "User";
        const avatar = profile?.avatar_url || meta.avatar_url || DEFAULT_AVATAR;

        if (!active) return;
        setAuthorName(name);
        setAuthorHandle(handle);
        setAuthorAvatar(avatar);
      } catch {
        if (!active) return;
        setAuthorName("User");
        setAuthorHandle("@user");
        setAuthorAvatar(DEFAULT_AVATAR);
      }
    };
    loadIdentity();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      if (aiErrorTimerRef.current) window.clearTimeout(aiErrorTimerRef.current);
    };
  }, [bannerPreview]);

  useEffect(() => {
    if (!bannerPreview) {
      setBannerMeta(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setBannerMeta({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = bannerPreview;
  }, [bannerPreview]);

  useEffect(() => {
    if (!cropFrameRef.current) return;
    const element = cropFrameRef.current;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setCropFrameSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bannerPreview]);

  const cropMetrics = useMemo(() => {
    if (!bannerMeta || !cropFrameSize) return null;
    if (!cropFrameSize.width || !cropFrameSize.height) return null;
    const baseScale = Math.max(
      cropFrameSize.width / bannerMeta.width,
      cropFrameSize.height / bannerMeta.height
    );
    return { frameWidth: cropFrameSize.width, frameHeight: cropFrameSize.height, baseScale };
  }, [bannerMeta, cropFrameSize]);

  const clampOffsets = useCallback(
    (next: { x: number; y: number }) => {
      if (!cropMetrics || !bannerMeta) return next;
      const scale = cropMetrics.baseScale * cropZoom;
      const maxX = Math.max((bannerMeta.width * scale - cropMetrics.frameWidth) / 2, 0);
      const maxY = Math.max((bannerMeta.height * scale - cropMetrics.frameHeight) / 2, 0);
      return {
        x: Math.min(Math.max(next.x, -maxX), maxX),
        y: Math.min(Math.max(next.y, -maxY), maxY),
      };
    },
    [bannerMeta, cropMetrics, cropZoom]
  );

  useEffect(() => {
    setCropOffset((prev) => clampOffsets(prev));
  }, [cropZoom, clampOffsets]);

  const applyFile = useCallback(
    (file: File | null) => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setBannerFile(file);
      if (file) {
        setBannerPreview(URL.createObjectURL(file));
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
      } else {
        setBannerPreview(null);
      }
    },
    [bannerPreview]
  );

  const handleDragStart = (event: ReactMouseEvent | ReactTouchEvent) => {
    if (!bannerPreview) return;
    const point =
      "touches" in event ? event.touches[0] : event;
    dragStateRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y,
    };
  };

  const handleDragMove = (event: ReactMouseEvent | ReactTouchEvent) => {
    if (!dragStateRef.current) return;
    const point =
      "touches" in event ? event.touches[0] : event;
    const dx = point.clientX - dragStateRef.current.startX;
    const dy = point.clientY - dragStateRef.current.startY;
    const next = clampOffsets({
      x: dragStateRef.current.offsetX + dx,
      y: dragStateRef.current.offsetY + dy,
    });
    setCropOffset(next);
  };

  const handleDragEnd = () => {
    dragStateRef.current = null;
  };

  const resetForm = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setTitle("");
    setSummary("");
    setDetails("");
    setTag(DEFAULT_TAG);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const renderCroppedBlob = useCallback(async () => {
    if (!bannerFile || !bannerPreview || !bannerMeta || !cropMetrics) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const img = new Image();
    const imageReady = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Unable to read image."));
    });
    img.src = bannerPreview;
    await imageReady;

    const scaleToCanvas = canvas.width / cropMetrics.frameWidth;
    const scale = cropMetrics.baseScale * cropZoom;
    const drawW = bannerMeta.width * scale * scaleToCanvas;
    const drawH = bannerMeta.height * scale * (canvas.height / cropMetrics.frameHeight);
    const drawX = (canvas.width - drawW) / 2 + cropOffset.x * scaleToCanvas;
    const drawY = (canvas.height - drawH) / 2 + cropOffset.y * (canvas.height / cropMetrics.frameHeight);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.92
      );
    });
  }, [bannerFile, bannerPreview, bannerMeta, cropMetrics, cropOffset, cropZoom]);

  const uploadBanner = async () => {
    if (!bannerFile) return null;
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Please sign in again to upload images.");
    }
    const bucketName = process.env.NEXT_PUBLIC_POST_IMAGES_BUCKET || "post-images";
    await supabase.auth.setSession(sessionData.session);
    const safeName = `${Date.now()}-${bannerFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const filePath = `posts/${safeName}`;

    const cropped = await renderCroppedBlob();
    const contentType = cropped?.type || bannerFile.type || "image/jpeg";
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, cropped ?? bannerFile, {
      upsert: false,
      cacheControl: "3600",
      contentType,
    });

    if (uploadError) {
      const msg =
        uploadError.message?.includes("Bucket not found")
          ? `Storage bucket '${bucketName}' not found. Check NEXT_PUBLIC_POST_IMAGES_BUCKET and Supabase project.`
          : uploadError.message;
      throw new Error(msg);
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const enhanceField = useCallback(
    async (field: "summary" | "details") => {
      if (!title.trim() && !summary.trim() && !details.trim()) {
        setAiError({ field, message: "Add a title or some text before using AI enhancement." });
        if (aiErrorTimerRef.current) window.clearTimeout(aiErrorTimerRef.current);
        aiErrorTimerRef.current = window.setTimeout(() => setAiError(null), 2500);
        return;
      }
      if (field === "summary") setAiSummaryLoading(true);
      if (field === "details") setAiDetailsLoading(true);
      setError("");
      setAiError(null);
      try {
        const response = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field,
            title,
            summary,
            details,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "AI enhancement failed.");
        }
        if (field === "summary") {
          setSummary(data.text || summary);
        } else {
          setDetails(data.text || details);
        }
      } catch (err) {
        setAiError({
          field,
          message: err instanceof Error ? err.message : "AI enhancement failed.",
        });
        if (aiErrorTimerRef.current) window.clearTimeout(aiErrorTimerRef.current);
        aiErrorTimerRef.current = window.setTimeout(() => setAiError(null), 2500);
      } finally {
        if (field === "summary") setAiSummaryLoading(false);
        if (field === "details") setAiDetailsLoading(false);
      }
    },
    [details, summary, title]
  );

  const handleSubmit = async () => {
    const trimmedTitle = trimOrEmpty(title);
    const trimmedSummary = trimOrEmpty(summary);
    const trimmedDetails = trimOrEmpty(details);

    if (!bannerFile || !trimmedTitle || !trimmedSummary || !trimmedDetails) {
      setError("Please upload a banner image and fill in the title, summary, and details.");
      return;
    }
    if (!authorId) {
      setError("You must be signed in to publish a post.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      setBannerUploading(true);
      const uploadedBanner = await uploadBanner();
      if (!uploadedBanner) {
        setError("Unable to upload the banner image. Try again.");
        setSubmitting(false);
        setBannerUploading(false);
        return;
      }
      setBannerUploading(false);

      const slugSeed = `${trimmedTitle}-${authorHandle.replace("@", "") || "user"}`;
      const slug = `${slugify(slugSeed)}-${Date.now()}`;

      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError("You must be signed in to publish a post.");
        setSubmitting(false);
        return;
      }
      const userId = authData.user.id;
      const { data, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          img: uploadedBanner,
          ava: authorAvatar || DEFAULT_AVATAR,
          author: authorName || "User",
          handle: authorHandle || "@user",
          tag,
          title: trimmedTitle,
          summary: trimmedSummary,
          desc: trimmedDetails,
          slug,
          views: "0",
          likes: "0",
          comments: "0",
          shares: "0",
        })
        .select("*")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Unable to create the post. Try again.");
        setSubmitting(false);
        return;
      }

      const impressions =
        typeof data.impressions_count === "number" ? data.impressions_count : null;
      const newPost: CardData = {
        id: data.id,
        img: data.img ?? uploadedBanner,
        ava: data.ava ?? authorAvatar ?? DEFAULT_AVATAR,
        author: data.author ?? authorName ?? "User",
        handle: data.handle ?? authorHandle ?? "@user",
        tag: data.tag ?? tag ?? DEFAULT_TAG,
        title: data.title ?? trimmedTitle,
        summary: data.summary ?? trimmedSummary,
        details: data.desc ?? trimmedDetails,
        views: impressions !== null ? `${impressions}` : (data.views ?? "0"),
        likes: data.likes ?? "0",
        dislikes:
          typeof data.dislikes_count === "number" ? `${data.dislikes_count}` : undefined,
        comments: data.comments ?? "0",
        shares: data.shares ?? "0",
        createdAt: data.created_at ?? new Date().toISOString(),
      };

      setCreatedPost(newPost);
      pushToast({ message: "Post published!", tone: "success" });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the post. Try again.");
    } finally {
      setSubmitting(false);
      setBannerUploading(false);
    }
  };

  return (
    <div
      className={`create-overlay${open ? " open" : ""}`}
      aria-hidden={!open}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="create-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="createTitle" aria-describedby="createSubtitle" tabIndex={-1}>
        <div className="create-head">
          <div>
            <div className="create-title" id="createTitle">
              Create Post
            </div>
            <div className="create-subtitle" id="createSubtitle">
              Publish a new project update.
            </div>
          </div>
          <button className="create-close" onClick={handleClose} aria-label="Close create dialog" type="button">
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="create-grid">
          <div className="create-form">
            <label className="create-field">
              <span className="create-label">Upload Image</span>
              <div
                className={`create-upload${dragActive ? " drag" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  applyFile(file);
                }}
              >
                <input
                  className="create-upload-input"
                  type="file"
                  accept="image/*"
                  aria-label="Upload image"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    applyFile(file);
                  }}
                />
                <div className="create-upload-ui">
                  <div className="create-upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 5v9" />
                      <path d="M8 9l4-4 4 4" />
                      <path d="M5 19h14" />
                    </svg>
                  </div>
                  <div className="create-upload-meta">
                    <div className="create-upload-title">
                      {bannerFile ? bannerFile.name : "Click to upload"}
                    </div>
                    <div className="create-upload-sub">
                      PNG, JPG or WebP - Suggested 1200x800
                    </div>
                  </div>
                  <div className="create-upload-cta">
                    {bannerFile ? "Replace" : "Upload"}
                  </div>
                </div>
                {bannerPreview ? (
                  <div
                    className="create-cropper"
                    ref={cropFrameRef}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    <img
                      src={bannerPreview}
                      alt="Crop preview"
                      style={{
                        transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${(cropMetrics?.baseScale ?? 1) * cropZoom})`,
                      }}
                    />
                  </div>
                ) : null}
                {bannerPreview ? (
                  <div className="create-crop-controls">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.05}
                      value={cropZoom}
                      onChange={(event) => setCropZoom(Number(event.target.value))}
                    />
                  </div>
                ) : null}
              </div>
            </label>

            <label className="create-field">
              <span className="create-label">Title</span>
              <input
                className="create-input"
                type="text"
                placeholder="Project name or update"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
              />
            </label>

            <label className="create-field">
              <span className="create-label">Category</span>
              <select
                className="create-select"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
              >
                {TAG_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="create-field">
              <span className="create-label">Summary</span>
              <div className="create-textarea-wrap">
                <textarea
                  className="create-textarea"
                  placeholder="Short overview for the card preview"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  maxLength={220}
                />
                <button
                  className="create-ai-btn"
                  type="button"
                  onClick={() => enhanceField("summary")}
                  disabled={aiSummaryLoading}
                  aria-label="Enhance summary with AI"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3l1.6 3.8L17 8.4l-3.4 1.3L12 13l-1.6-3.3L7 8.4l3.4-1.6L12 3z" />
                    <path d="M18.5 13.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2z" />
                  </svg>
                  {aiSummaryLoading ? "AI..." : "AI"}
                </button>
                {aiError?.field === "summary" ? (
                  <div className="create-ai-error">{aiError.message}</div>
                ) : null}
              </div>
            </label>

            <label className="create-field">
              <span className="create-label">Details</span>
              <div className="create-textarea-wrap">
                <textarea
                  className="create-textarea details"
                  placeholder="Full story, outcomes, and context"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  maxLength={1200}
                />
                <button
                  className="create-ai-btn"
                  type="button"
                  onClick={() => enhanceField("details")}
                  disabled={aiDetailsLoading}
                  aria-label="Enhance details with AI"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3l1.6 3.8L17 8.4l-3.4 1.3L12 13l-1.6-3.3L7 8.4l3.4-1.6L12 3z" />
                    <path d="M18.5 13.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2z" />
                  </svg>
                  {aiDetailsLoading ? "AI..." : "AI"}
                </button>
                {aiError?.field === "details" ? (
                  <div className="create-ai-error">{aiError.message}</div>
                ) : null}
              </div>
            </label>

            {error ? <div className="create-error">{error}</div> : null}

            <div className="create-actions">
              <button className="create-secondary" type="button" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="create-primary"
                type="button"
                onClick={handleSubmit}
                disabled={submitting || bannerUploading}
              >
                {submitting || bannerUploading ? "Publishing..." : "Publish Post"}
              </button>
            </div>
          </div>

          <div className="create-preview">
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner preview" />
            ) : (
              <div className="create-preview-empty">Banner preview</div>
            )}
            <div className="create-preview-meta">
              <h3>{title || "Post title"}</h3>
              <div className="create-preview-tag">{tag || DEFAULT_TAG}</div>
              <p>{summary || "Summary text appears here."}</p>
              <p className="create-preview-details">
                {details ? `${details.substring(0, 140)}...` : "Details preview appears here."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
