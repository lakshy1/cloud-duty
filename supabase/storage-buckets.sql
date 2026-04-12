-- ============================================================
-- Storage Buckets for Reading Queue
-- Run this in the Supabase SQL editor on your new project
-- ============================================================

-- post-images: stores post cover images
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- profile-photos: stores user avatar images
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- profile-covers: stores user cover/banner images
insert into storage.buckets (id, name, public)
values ('profile-covers', 'profile-covers', true)
on conflict (id) do nothing;


-- ============================================================
-- post-images policies
-- ============================================================

drop policy if exists "public read post images" on storage.objects;
create policy "public read post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "authenticated upload post images" on storage.objects;
create policy "authenticated upload post images"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

drop policy if exists "owner update post images" on storage.objects;
create policy "owner update post images"
  on storage.objects for update
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "owner delete post images" on storage.objects;
create policy "owner delete post images"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- profile-photos policies
-- ============================================================

drop policy if exists "public read profile photos" on storage.objects;
create policy "public read profile photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "authenticated upload profile photos" on storage.objects;
create policy "authenticated upload profile photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

drop policy if exists "owner update profile photos" on storage.objects;
create policy "owner update profile photos"
  on storage.objects for update
  using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "owner delete profile photos" on storage.objects;
create policy "owner delete profile photos"
  on storage.objects for delete
  using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- profile-covers policies
-- ============================================================

drop policy if exists "public read profile covers" on storage.objects;
create policy "public read profile covers"
  on storage.objects for select
  using (bucket_id = 'profile-covers');

drop policy if exists "authenticated upload profile covers" on storage.objects;
create policy "authenticated upload profile covers"
  on storage.objects for insert
  with check (bucket_id = 'profile-covers' and auth.role() = 'authenticated');

drop policy if exists "owner update profile covers" on storage.objects;
create policy "owner update profile covers"
  on storage.objects for update
  using (bucket_id = 'profile-covers' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'profile-covers' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "owner delete profile covers" on storage.objects;
create policy "owner delete profile covers"
  on storage.objects for delete
  using (bucket_id = 'profile-covers' and auth.uid()::text = (storage.foldername(name))[1]);
