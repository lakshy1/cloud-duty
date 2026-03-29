"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppShell } from "../components/AppShell";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useUIState } from "../state/ui-state";
import { Loader } from "../components/Loader";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [savedFullName, setSavedFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editUsername, setEditUsername] = useState(false);
  const [editFullName, setEditFullName] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [stats, setStats] = useState({ posts: 0, likes: 0, followers: 0 });
  const [bio, setBio] = useState("");
  const [savedBio, setSavedBio] = useState("");
  const [editBio, setEditBio] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [savedSkills, setSavedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [editSkills, setEditSkills] = useState(false);
  const { pushToast } = useUIState();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setProfileLoading(false);
    };
    loadUser();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const meta = user?.user_metadata ?? {};
  const metaFullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
  const displayFullName = savedFullName || fullNameInput || metaFullName || "Your name";
  const baseUsername = useMemo(() => {
    const raw =
      meta.username ||
      meta.preferred_username ||
      meta.user_name ||
      displayFullName ||
      "user";
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }, [displayFullName, meta.preferred_username, meta.user_name, meta.username]);

  const normalizeUsername = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const checkUsernameAvailable = async (value: string, userId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", value)
      .limit(1);
    if (error) return false;
    if (!data || data.length === 0) return true;
    return data[0].user_id === userId;
  };

  const ensureProfile = async (userId: string) => {
    const supabase = getSupabaseBrowserClient();
    let data: Record<string, unknown> | null = null;
    const { data: fullData, error: fullError } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url, cover_url, bio, skills")
      .eq("user_id", userId)
      .maybeSingle();
    if (fullError) {
      const { data: basicData } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url, cover_url")
        .eq("user_id", userId)
        .maybeSingle();
      data = basicData as Record<string, unknown> | null;
    } else {
      data = fullData as Record<string, unknown> | null;
    }
    if (data?.avatar_url) setAvatarUrl(data.avatar_url as string);
    if (data?.cover_url) setCoverUrl(data.cover_url as string);
    if (data?.bio) { setBio(data.bio as string); setSavedBio(data.bio as string); }
    if (Array.isArray(data?.skills) && (data.skills as string[]).length > 0) {
      setSkills(data.skills as string[]); setSavedSkills(data.skills as string[]);
    }
    if (data?.full_name) {
      setFullNameInput(data.full_name as string);
      setSavedFullName(data.full_name as string);
    } else if (metaFullName) {
      setFullNameInput(metaFullName);
      setSavedFullName(metaFullName);
    }
    if (data?.username) {
      setUsername(data.username as string);
      setSavedUsername(data.username as string);
      setEditUsername(false);
      return;
    }
    let candidate = baseUsername || "user";
    for (let i = 0; i < 5; i += 1) {
      const attempt = i === 0 ? candidate : `${candidate}-${Math.floor(Math.random() * 999) + 1}`;
      const available = await checkUsernameAvailable(attempt, userId);
      if (!available) continue;
      await supabase.from("profiles").upsert({
        user_id: userId,
        username: attempt,
        full_name: metaFullName || null,
      });
      setUsername(attempt);
      setSavedUsername(attempt);
      setEditUsername(false);
      return;
    }
    pushToast({ message: "Unable to reserve a username. Try again.", tone: "error" });
  };

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      try {
        await ensureProfile(user.id);
      } finally {
        if (active) setProfileLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [baseUsername, metaFullName, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setStats({ posts: 0, likes: 0, followers: 0 });
      return;
    }
    let active = true;
    const loadStats = async () => {
      const supabase = getSupabaseBrowserClient();
      const [postsRes, likeRows, followersRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase.from("posts").select("likes_count").eq("user_id", user.id),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", user.id),
      ]);
      if (!active) return;
      const likesTotal =
        likeRows.data?.reduce(
          (sum, row) => sum + (typeof row.likes_count === "number" ? row.likes_count : 0),
          0
        ) ?? 0;
      setStats({
        posts: postsRes.count ?? 0,
        likes: likesTotal,
        followers: followersRes.count ?? 0,
      });
    };
    loadStats();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleSaveUsername = async () => {
    if (!user?.id) return;
    setLoading(true);
    const rawUsername = editUsername ? username : savedUsername || username || baseUsername;
    const trimmed = normalizeUsername(rawUsername.trim());
    if (!trimmed) {
      setLoading(false);
      pushToast({ message: "Username cannot be empty.", tone: "warning" });
      return;
    }
    if (editUsername && trimmed !== savedUsername) {
      const available = await checkUsernameAvailable(trimmed, user.id);
      if (!available) {
        setLoading(false);
        pushToast({ message: "Username already exists. Choose a new one.", tone: "error" });
        return;
      }
    }
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      pushToast({ message: "Please sign in again to upload a profile photo.", tone: "error" });
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      username: trimmed,
      full_name: savedFullName || fullNameInput || metaFullName || null,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
    });
    setLoading(false);
    if (error) {
      console.error("Error saving username:", error);
      pushToast({ message: error.message, tone: "error" });
      return;
    }
    console.log("Successfully saved username:", trimmed);
    setSavedUsername(trimmed);
    setEditUsername(false);
    pushToast({ message: "Profile updated.", tone: "success" });
  };

  const handleSaveFullName = async () => {
    if (!user?.id) return;
    const nextFullName = fullNameInput.trim();
    if (!nextFullName) {
      pushToast({ message: "Full name cannot be empty.", tone: "warning" });
      return;
    }
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      pushToast({ message: "Please sign in again to update your profile.", tone: "error" });
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      username: savedUsername || username || baseUsername,
      full_name: nextFullName,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
    });
    setLoading(false);
    if (error) {
      console.error("Error saving full name:", error);
      pushToast({ message: error.message, tone: "error" });
      return;
    }
    console.log("Successfully saved full name:", nextFullName);
    setSavedFullName(nextFullName);
    setEditFullName(false);
    pushToast({ message: "Profile updated.", tone: "success" });
  };

  const handleAvatarUpload = async (file?: File | null) => {
    const nextFile = file ?? avatarFile;
    if (!user?.id || !nextFile) return;
    setAvatarUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        pushToast({ message: "Please sign in again to upload a profile photo.", tone: "error" });
        setAvatarUploading(false);
        return;
      }
      const bucketName =
        process.env.NEXT_PUBLIC_PROFILE_IMAGES_BUCKET ||
        process.env.NEXT_PUBLIC_POST_IMAGES_BUCKET ||
        "profile-photos";
      await supabase.auth.setSession(sessionData.session);
      const safeName = nextFile.name.replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = `avatars/${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, nextFile, {
        upsert: true,
        cacheControl: "3600",
        contentType: nextFile.type || "image/jpeg",
      });
      if (uploadError) {
        const msg =
          uploadError.message?.includes("Bucket not found")
            ? `Storage bucket '${bucketName}' not found. Check NEXT_PUBLIC_PROFILE_IMAGES_BUCKET and Supabase project.`
            : uploadError.message;
        pushToast({ message: msg, tone: "error" });
        setAvatarUploading(false);
        return;
      }
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      const nextUsername = savedUsername || username || baseUsername || null;
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        username: nextUsername,
        full_name: savedFullName || fullNameInput || metaFullName || null,
        avatar_url: publicUrl,
        cover_url: coverUrl,
      });
      if (error) {
        pushToast({ message: error.message, tone: "error" });
        setAvatarUploading(false);
        return;
      }
      setAvatarUrl(publicUrl);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setAvatarFile(null);
      pushToast({ message: "Profile photo updated.", tone: "success" });
    } catch (err) {
      pushToast({
        message: err instanceof Error ? err.message : "Unable to upload profile photo. Try again.",
        tone: "error",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCoverUpload = async (file?: File | null) => {
    const nextFile = file ?? coverFile;
    if (!user?.id || !nextFile) return;
    setCoverUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        pushToast({ message: "Please sign in again to upload a cover photo.", tone: "error" });
        setCoverUploading(false);
        return;
      }
      const bucketName =
        process.env.NEXT_PUBLIC_COVER_IMAGES_BUCKET ||
        process.env.NEXT_PUBLIC_POST_IMAGES_BUCKET ||
        "profile-covers";
      await supabase.auth.setSession(sessionData.session);
      const safeName = nextFile.name.replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = `covers/${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, nextFile, {
        upsert: true,
        cacheControl: "3600",
        contentType: nextFile.type || "image/jpeg",
      });
      if (uploadError) {
        const msg =
          uploadError.message?.includes("Bucket not found")
            ? `Storage bucket '${bucketName}' not found. Check NEXT_PUBLIC_COVER_IMAGES_BUCKET and Supabase project.`
            : uploadError.message;
        pushToast({ message: msg, tone: "error" });
        setCoverUploading(false);
        return;
      }
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      const nextUsername = savedUsername || username || baseUsername || null;
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        username: nextUsername,
        full_name: savedFullName || fullNameInput || metaFullName || null,
        avatar_url: avatarUrl,
        cover_url: publicUrl,
      });
      if (error) {
        pushToast({ message: error.message, tone: "error" });
        setCoverUploading(false);
        return;
      }
      setCoverUrl(publicUrl);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
      setCoverFile(null);
      pushToast({ message: "Cover photo updated.", tone: "success" });
    } catch (err) {
      pushToast({
        message: err instanceof Error ? err.message : "Unable to upload cover photo. Try again.",
        tone: "error",
      });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverClear = async () => {
    if (!user?.id) return;
    setCoverUploading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ cover_url: null })
      .eq("user_id", user.id);
    setCoverUploading(false);
    if (error) {
      pushToast({ message: error.message, tone: "error" });
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setCoverFile(null);
    setCoverUrl(null);
    pushToast({ message: "Cover photo removed.", tone: "success" });
  };

  const handleAvatarClear = async () => {
    if (!user?.id) return;
    setAvatarUploading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", user.id);
    setAvatarUploading(false);
    if (error) {
      pushToast({ message: error.message, tone: "error" });
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarUrl(null);
    pushToast({ message: "Profile photo removed.", tone: "success" });
  };

  const handleSaveBio = async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("profiles").update({ bio: bio.trim() || null }).eq("user_id", user.id);
    setLoading(false);
    if (error) { pushToast({ message: error.message, tone: "error" }); return; }
    setSavedBio(bio.trim());
    setEditBio(false);
    pushToast({ message: "About updated.", tone: "success" });
  };

  const handleSaveSkills = async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const cleanSkills = skills.filter((s) => s.trim());
    const { error } = await supabase.from("profiles").update({ skills: cleanSkills }).eq("user_id", user.id);
    setLoading(false);
    if (error) { pushToast({ message: error.message, tone: "error" }); return; }
    setSavedSkills(cleanSkills);
    setEditSkills(false);
    pushToast({ message: "Skills updated.", tone: "success" });
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed)) { setSkillInput(""); return; }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("profiles")
      .update({ username: null })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      pushToast({ message: error.message, tone: "error" });
      return;
    }
    setUsername("");
    setSavedUsername("");
    setEditUsername(false);
    pushToast({ message: "Username cleared.", tone: "success" });
  };

  return (
    <AppShell>
      <div className="page-shell">
        <section className="page-card profile-card">
          {profileLoading ? (
            <Loader label="Loading profile" />
          ) : (
            <>
          <div
            className="profile-cover"
            style={
              coverPreview || coverUrl
                ? { backgroundImage: `url(${coverPreview || coverUrl})` }
                : undefined
            }
          >
            <div className="profile-cover-bg" aria-hidden="true" />
            <div className="profile-cover-main">
              <input
                ref={avatarInputRef}
                className="profile-upload-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                  handleAvatarUpload(file);
                  event.target.value = "";
                }}
              />
              <button
                className="profile-avatar profile-avatar--xl profile-avatar-btn"
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Edit profile photo"
              >
                {avatarPreview || avatarUrl ? (
                  <img src={avatarPreview || avatarUrl || ""} alt={displayFullName} />
                ) : (
                  <span>{(displayFullName || savedUsername || username || baseUsername || "U")[0]?.toUpperCase()}</span>
                )}
              </button>
              <div className="profile-inline">
                <div className="profile-inline-row">
                  {editFullName ? (
                    <input
                      className="profile-inline-input"
                      type="text"
                      value={fullNameInput}
                      onChange={(event) => setFullNameInput(event.target.value)}
                    />
                  ) : (
                    <div className="profile-inline-name">{displayFullName}</div>
                  )}
                  <div className="profile-inline-actions">
                    {editFullName ? (
                      <>
                        <button
                          className="profile-mini-btn"
                          type="button"
                          onClick={handleSaveFullName}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="profile-mini-btn ghost"
                          type="button"
                          onClick={() => {
                            setEditFullName(false);
                            setFullNameInput(savedFullName || metaFullName);
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="profile-mini-btn" type="button" onClick={() => setEditFullName(true)}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <div className="profile-inline-row">
                  {editUsername ? (
                    <input
                      className="profile-inline-input small"
                      type="text"
                      placeholder={baseUsername || "username"}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  ) : (
                    <div className="profile-inline-handle">
                      @{savedUsername || username || baseUsername || "user"}
                    </div>
                  )}
                  <div className="profile-inline-actions">
                    {editUsername ? (
                      <>
                        <button
                          className="profile-mini-btn"
                          type="button"
                          onClick={handleSaveUsername}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="profile-mini-btn ghost"
                          type="button"
                          onClick={() => {
                            setEditUsername(false);
                            setUsername(savedUsername);
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="profile-mini-btn" type="button" onClick={() => setEditUsername(true)}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="profile-cover-edit">
              <input
                ref={coverInputRef}
                className="profile-upload-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  if (coverPreview) URL.revokeObjectURL(coverPreview);
                  setCoverFile(file);
                  setCoverPreview(URL.createObjectURL(file));
                  handleCoverUpload(file);
                  event.target.value = "";
                }}
              />
              <button
                className="profile-cover-edit-btn"
                type="button"
                onClick={() => coverInputRef.current?.click()}
                aria-label="Edit cover photo"
              >
                Edit cover
              </button>
              {coverUploading && <div className="profile-cover-saving">Saving...</div>}
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <div className="profile-stat-val">{stats.posts}</div>
              <div className="profile-stat-label">Posts</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">{stats.likes}</div>
              <div className="profile-stat-label">Likes</div>
            </div>
            <div className="profile-stat">
              <div className="profile-stat-val">{stats.followers}</div>
              <div className="profile-stat-label">Followers</div>
            </div>
          </div>

          <div className="page-kv">
            <div>
              <p className="page-label">Full name</p>
              <p className="page-value">{displayFullName || "Not set"}</p>
            </div>
            <div>
              <p className="page-label">Email</p>
              <p className="page-value">{user?.email ?? "Not available"}</p>
            </div>
            <div>
              <p className="page-label">Phone</p>
              <p className="page-value">{meta.phone ?? "Not set"}</p>
            </div>
            <div>
              <p className="page-label">Provider</p>
              <p className="page-value">{meta.provider ?? "email"}</p>
            </div>
          </div>

          {/* ── About / Bio ── */}
          <div className="prof-section">
            <div className="prof-section-head">
              <div className="prof-section-title">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                About
              </div>
              {!editBio && (
                <button className="profile-mini-btn" type="button" onClick={() => setEditBio(true)}>
                  {savedBio ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {editBio ? (
              <div className="prof-bio-edit">
                <textarea
                  className="prof-bio-textarea"
                  placeholder="Write a brief bio about yourself — your background, interests, or what drives you..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={600}
                  rows={4}
                />
                <div className="prof-bio-footer">
                  <span className="prof-bio-count">{bio.length}/600</span>
                  <div className="prof-section-actions">
                    <button className="profile-mini-btn ghost" type="button" onClick={() => { setEditBio(false); setBio(savedBio); }}>Cancel</button>
                    <button className="profile-mini-btn" type="button" onClick={handleSaveBio} disabled={loading}>Save</button>
                  </div>
                </div>
              </div>
            ) : savedBio ? (
              <p className="prof-bio-text">{savedBio}</p>
            ) : (
              <p className="prof-bio-empty">Add a bio to let people know who you are.</p>
            )}
          </div>

          {/* ── Skills ── */}
          <div className="prof-section">
            <div className="prof-section-head">
              <div className="prof-section-title">
                <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Skills
              </div>
              {!editSkills && (
                <button className="profile-mini-btn" type="button" onClick={() => { setEditSkills(true); setSkills(savedSkills); }}>
                  {savedSkills.length > 0 ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {editSkills ? (
              <div className="prof-skills-edit">
                <div className="prof-skills-tags">
                  {skills.map((sk, i) => (
                    <span className="prof-skill-tag editing" key={sk + i}>
                      {sk}
                      <button type="button" className="prof-skill-remove" onClick={() => removeSkill(i)} aria-label={`Remove ${sk}`}>×</button>
                    </span>
                  ))}
                </div>
                <div className="prof-skill-input-row">
                  <input
                    className="prof-skill-input"
                    type="text"
                    placeholder="Add a skill and press Enter…"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); } }}
                  />
                  <button className="profile-mini-btn" type="button" onClick={addSkill} disabled={!skillInput.trim()}>Add</button>
                </div>
                <p className="prof-skill-hint">Press Enter or comma to add each skill</p>
                <div className="prof-section-actions" style={{ marginTop: 10 }}>
                  <button className="profile-mini-btn ghost" type="button" onClick={() => { setEditSkills(false); setSkills(savedSkills); setSkillInput(""); }}>Cancel</button>
                  <button className="profile-mini-btn" type="button" onClick={handleSaveSkills} disabled={loading}>Save</button>
                </div>
              </div>
            ) : savedSkills.length > 0 ? (
              <div className="prof-skills-tags">
                {savedSkills.map((sk, i) => (
                  <span className="prof-skill-tag" key={sk + i}>{sk}</span>
                ))}
              </div>
            ) : (
              <p className="prof-bio-empty">Add skills to showcase your expertise.</p>
            )}
          </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
