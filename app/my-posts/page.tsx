"use client";

import { useEffect, useState } from "react";
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
  const [savingEdit, setSavingEdit] = useState(false);
  const { pushToast, searchQuery } = useUIState();

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
        .select("id, img, title, summary, desc, created_at")
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
    setEditDetails(post.desc ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    const trimmedTitle = editTitle.trim();
    const trimmedSummary = editSummary.trim();
    const trimmedDetails = editDetails.trim();
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
    const { error } = await supabase
      .from("posts")
      .update({ title: trimmedTitle, summary: trimmedSummary, desc: trimmedDetails })
      .eq("id", editingPost.id)
      .eq("user_id", userId);
    if (error) {
      pushToast({ message: error.message, tone: "error" });
      setSavingEdit(false);
      return;
    }
    setPosts((prev) =>
      prev.map((post) =>
        post.id === editingPost.id
          ? { ...post, title: trimmedTitle, summary: trimmedSummary, desc: trimmedDetails }
          : post
      )
    );
    setSavingEdit(false);
    setEditingPost(null);
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
            <p className="page-subtitle">
              {normalizedQuery ? "No posts match your search." : "No posts yet."}
            </p>
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
                if (event.target === event.currentTarget) setEditingPost(null);
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
                  <button className="edit-close" type="button" onClick={() => setEditingPost(null)}>
                    <svg viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="edit-body">
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
                </div>
                <div className="edit-actions">
                  <button className="edit-secondary" type="button" onClick={() => setEditingPost(null)}>
                    Cancel
                  </button>
                  <button className="edit-primary" type="button" onClick={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "Save changes"}
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
