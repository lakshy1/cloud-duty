"use client";

import { useEffect, useRef, useState } from "react";
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
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useFocusTrap(panelRef, open, { onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    setError("");
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
    };
  }, [bannerPreview]);

  const resetForm = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setTitle("");
    setSummary("");
    setDetails("");
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

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

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, bannerFile, {
      upsert: false,
      cacheControl: "3600",
      contentType: bannerFile.type || "image/jpeg",
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
          tag: DEFAULT_TAG,
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
        tag: data.tag ?? DEFAULT_TAG,
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
              <div className="create-upload">
                <input
                  className="create-upload-input"
                  type="file"
                  accept="image/*"
                  aria-label="Upload image"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                    setBannerFile(file);
                    setBannerPreview(file ? URL.createObjectURL(file) : null);
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
                      PNG, JPG or WebP • Suggested 1200x800
                    </div>
                  </div>
                  <div className="create-upload-cta">
                    {bannerFile ? "Replace" : "Upload"}
                  </div>
                </div>
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
              <span className="create-label">Summary</span>
              <textarea
                className="create-textarea"
                placeholder="Short overview for the card preview"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={220}
              />
            </label>

            <label className="create-field">
              <span className="create-label">Details</span>
              <textarea
                className="create-textarea details"
                placeholder="Full story, outcomes, and context"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1200}
              />
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
