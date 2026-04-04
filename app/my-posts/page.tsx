"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AppShell } from "../components/AppShell";
import { Loader } from "../components/Loader";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useUIState } from "../state/ui-state";

type MyPost = {
  id: string;
  img: string;
  title: string;
  summary: string;
  desc?: string;
  created_at?: string;
  tag?: string;
};

const normalizeMarkdownForEdit = (input: string) => {
  if (!input) return "";
  let text = input.replace(/\r\n/g, "\n").trim();
  text = text.replace(/([.?!])\s+\*\*/g, "$1\n\n**");
  text = text.replace(/\s+([*-])\s+/g, "\n$1 ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
};

export default function MyPostsPage() {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MyPost | null>(null);
  const [editingPost, setEditingPost] = useState<MyPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editTag, setEditTag] = useState("Project");
  const [editTagOpen, setEditTagOpen] = useState(false);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [editBannerUploading, setEditBannerUploading] = useState(false);
  const [editBannerIsObject, setEditBannerIsObject] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const { pushToast, searchQuery, setCreateOpen } = useUIState();
  const tagOptions = ["Project", "Design", "Engineering", "Marketing", "Research", "Product"];
  const editTagMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        setPosts([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("posts")
        .select("id, img, title, summary, desc, created_at, tag")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error || !data) {
        setPosts([]);
        setLoading(false);
        return;
      }
      setPosts(data as MyPost[]);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
    const supabase = getSupabaseBrowserClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      pushToast({ message: "Please sign in again.", tone: "error" });
      setDeletingId(null);
      return;
    }
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
    if (error) {
      pushToast({ message: error.message, tone: "error" });
      setDeletingId(null);
      return;
    }
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setDeletingId(null);
    pushToast({ message: "Post deleted.", tone: "success" });
  };

  const openEdit = (post: MyPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditSummary(post.summary);
    setEditDetails(normalizeMarkdownForEdit(post.desc ?? ""));
    setEditTag(post.tag ?? "Project");
    setEditBannerFile(null);
    setEditBannerPreview(post.img ?? null);
    setEditBannerIsObject(false);
  };

  const closeEdit = () => {
    if (editBannerPreview && editBannerIsObject) {
      URL.revokeObjectURL(editBannerPreview);
    }
    setEditBannerFile(null);
    setEditBannerPreview(null);
    setEditBannerIsObject(false);
    setEditTagOpen(false);
    setEditingPost(null);
  };

  useEffect(() => {
    return () => {
      if (editBannerPreview && editBannerIsObject) {
        URL.revokeObjectURL(editBannerPreview);
      }
    };
  }, [editBannerPreview, editBannerIsObject]);

  useEffect(() => {
    if (!editTagOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!editTagMenuRef.current?.contains(target)) {
        setEditTagOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [editTagOpen]);

  const uploadBanner = async () => {
    if (!editBannerFile) return null;
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Please sign in again to upload images.");
    }
    const bucketName = process.env.NEXT_PUBLIC_POST_IMAGES_BUCKET || "post-images";
    await supabase.auth.setSession(sessionData.session);
    const safeName = `${Date.now()}-${editBannerFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const filePath = `posts/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, editBannerFile, {
        upsert: false,
        cacheControl: "3600",
        contentType: editBannerFile.type || "image/jpeg",
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    const trimmedTitle = editTitle.trim();
    const trimmedSummary = editSummary.trim();
    const trimmedDetails = editDetails.trim();
    const trimmedTag = editTag.trim() || "Project";
    if (!trimmedTitle || !trimmedSummary || !trimmedDetails) {
      pushToast({ message: "Title, summary, and details are required.", tone: "warning" });
      return;
    }
    setSavingEdit(true);
    const supabase = getSupabaseBrowserClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      pushToast({ message: "Please sign in again.", tone: "error" });
      setSavingEdit(false);
      return;
    }
    let nextImage: string | null = null;
    if (editBannerFile) {
      try {
        setEditBannerUploading(true);
        nextImage = await uploadBanner();
      } catch (error) {
        pushToast({
          message: error instanceof Error ? error.message : "Unable to upload image.",
          tone: "error",
        });
        setSavingEdit(false);
        setEditBannerUploading(false);
        return;
      }
      setEditBannerUploading(false);
    }
    const { error } = await supabase
      .from("posts")
      .update({
        title: trimmedTitle,
        summary: trimmedSummary,
        desc: trimmedDetails,
        tag: trimmedTag,
        img: nextImage ?? editingPost.img,
      })
      .eq("id", editingPost.id)
      .eq("user_id", userId);
    if (error) {
      pushToast({ message: error.message, tone: "error" });
      setSavingEdit(false);
      setEditBannerUploading(false);
      return;
    }
    setPosts((prev) =>
      prev.map((post) =>
        post.id === editingPost.id
          ? {
              ...post,
              title: trimmedTitle,
              summary: trimmedSummary,
              desc: trimmedDetails,
              tag: trimmedTag,
              img: nextImage ?? post.img,
            }
          : post
      )
    );
    setSavingEdit(false);
    setEditBannerUploading(false);
    closeEdit();
    pushToast({ message: "Post updated.", tone: "success" });
  };

  const formatDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = normalizedQuery
    ? posts.filter((post) => {
        const title = (post.title ?? "").toLowerCase();
        const summary = (post.summary ?? "").toLowerCase();
        const details = (post.desc ?? "").toLowerCase();
        return (
          title.includes(normalizedQuery) ||
          summary.includes(normalizedQuery) ||
          details.includes(normalizedQuery)
        );
      })
    : posts;

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-hero">
          <p className="page-kicker">Profile</p>
          <h1 className="page-title">My Posts</h1>
          <p className="page-subtitle">Manage your published updates.</p>
        </section>

        <section className="page-card my-posts-card">
          {loading ? (
            <Loader label="Loading your posts" />
          ) : filteredPosts.length === 0 ? (
            <div className="my-posts-empty">
              <p className="page-subtitle">
                {normalizedQuery ? "No posts match your search." : "No posts yet."}
              </p>
              {!normalizedQuery ? (
                <button className="my-posts-empty-cta" type="button" onClick={() => setCreateOpen(true)}>
                  Create new post
                </button>
              ) : null}
            </div>
          ) : (
            <div className="my-posts-grid">
              {filteredPosts.map((post) => (
                <article className="my-post" key={post.id}>
                  <div className="my-post-media">
                    <Image src={post.img} alt={post.title} fill sizes="(max-width: 760px) 100vw, 33vw" />
                    <button
                      className="my-post-edit-fab"
                      type="button"
                      onClick={() => openEdit(post)}
                      aria-label={`Edit ${post.title}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25z" />
                        <path d="M14.06 6.19l3.75 3.75" />
                      </svg>
                    </button>
                  </div>
                  <div className="my-post-body">
                    <div className="my-post-head">
                      <div className="my-post-head-main">
                        <div className="my-post-title">{post.title}</div>
                        {post.created_at ? (
                          <div className="my-post-date">{formatDate(post.created_at)}</div>
                        ) : null}
                      </div>
                      <div className="my-post-actions">
                        <button className="my-post-edit" type="button" onClick={() => openEdit(post)}>
                          Edit
                        </button>
                        <button
                          className="my-post-delete"
                          type="button"
                          onClick={() => setPendingDelete(post)}
                          disabled={deletingId === post.id}
                        >
                          {deletingId === post.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    <div className="my-post-summary">{post.summary}</div>
                    {post.desc ? <div className="my-post-details">{post.desc}</div> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {pendingDelete
        ? createPortal(
            <div
              className="delete-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget) setPendingDelete(null);
              }}
            >
              <div className="delete-panel" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
                <div className="delete-head">
                  <div>
                    <div className="delete-title" id="deleteTitle">
                      Delete post?
                    </div>
                    <div className="delete-subtitle">This action cannot be undone.</div>
                  </div>
                  <button className="delete-close" type="button" onClick={() => setPendingDelete(null)}>
                    <svg viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="delete-body">
                  <div className="delete-preview">
                    <div className="delete-preview-title">{pendingDelete.title}</div>
                    {pendingDelete.created_at ? (
                      <div className="delete-preview-date">{formatDate(pendingDelete.created_at)}</div>
                    ) : null}
                  </div>
                </div>
                <div className="delete-actions">
                  <button className="delete-secondary" type="button" onClick={() => setPendingDelete(null)}>
                    Cancel
                  </button>
                  <button
                    className="delete-primary"
                    type="button"
                    onClick={async () => {
                      const id = pendingDelete.id;
                      setPendingDelete(null);
                      await handleDelete(id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {editingPost
        ? createPortal(
            <div
              className="edit-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeEdit();
              }}
            >
              <div className="edit-panel" role="dialog" aria-modal="true" aria-labelledby="editTitle">
                <div className="edit-head">
                  <div>
                    <div className="edit-title" id="editTitle">
                      Edit post
                    </div>
                    <div className="edit-subtitle">Update your post details.</div>
                  </div>
                  <button className="edit-close" type="button" onClick={closeEdit}>
                    <svg viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="edit-body">
                  <label className="edit-field">
                    <span>Banner image</span>
                    <div className="edit-upload">
                      <input
                        id="edit-banner-input"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          if (editBannerPreview && editBannerIsObject) {
                            URL.revokeObjectURL(editBannerPreview);
                          }
                          setEditBannerFile(file);
                          if (file) {
                            setEditBannerPreview(URL.createObjectURL(file));
                            setEditBannerIsObject(true);
                          } else {
                            setEditBannerPreview(editingPost.img);
                            setEditBannerIsObject(false);
                          }
                        }}
                      />
                      <div className="edit-upload-preview">
                        {editBannerPreview ? (
                          <img src={editBannerPreview} alt="Banner preview" />
                        ) : (
                          <div className="edit-upload-placeholder">No image selected</div>
                        )}
                        <label className="edit-upload-cta" htmlFor="edit-banner-input">
                          Edit image
                        </label>
                      </div>
                    </div>
                  </label>
                  <label className="edit-field">
                    <span>Tag</span>
                    <div className="edit-tag-select" ref={editTagMenuRef}>
                      <button
                        type="button"
                        className={`edit-tag-trigger${editTagOpen ? " open" : ""}`}
                        onClick={() => setEditTagOpen((prev) => !prev)}
                        aria-haspopup="listbox"
                        aria-expanded={editTagOpen}
                      >
                        <span>{editTag}</span>
                      </button>
                      {editTagOpen ? (
                        <div className="edit-tag-menu" role="listbox" aria-label="Tag">
                          {tagOptions.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className={`edit-tag-option${editTag === tag ? " active" : ""}`}
                              role="option"
                              aria-selected={editTag === tag}
                              onClick={() => {
                                setEditTag(tag);
                                setEditTagOpen(false);
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </label>
                  <label className="edit-field">
                    <span>Title</span>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>Summary</span>
                    <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} />
                  </label>
                  <label className="edit-field">
                    <span>Details</span>
                    <textarea
                      className="edit-details"
                      value={editDetails}
                      onChange={(e) => setEditDetails(e.target.value)}
                    />
                  </label>
                  <div className="create-preview edit-preview-card">
                    {editBannerPreview ? (
                      <img src={editBannerPreview} alt="Banner preview" />
                    ) : (
                      <div className="create-preview-empty">Banner preview</div>
                    )}
                    <div className="create-preview-meta">
                      <h3>{editTitle || "Post title"}</h3>
                      <div className="create-preview-tag">{editTag || "Project"}</div>
                      <p>{editSummary || "Summary text appears here."}</p>
                      <p className="create-preview-details">
                        {editDetails ? `${editDetails.substring(0, 140)}...` : "Details preview appears here."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="edit-actions">
                  <button className="edit-secondary" type="button" onClick={closeEdit}>
                    Cancel
                  </button>
                  <button
                    className="edit-primary"
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit || editBannerUploading}
                  >
                    {savingEdit || editBannerUploading ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </AppShell>
  );
}
