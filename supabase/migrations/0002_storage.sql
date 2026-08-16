insert into storage.buckets (id, name, public)
values ('case-images', 'case-images', true);

create policy "case_images_public_read" on storage.objects
  for select using (bucket_id = 'case-images');

create policy "case_images_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-images');
