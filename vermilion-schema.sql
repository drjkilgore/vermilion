-- =====================================================================
--  VERMILION — Phase 1 schema
--  Run this once in your Supabase project: SQL Editor → paste → Run.
--  Safe to re-run (idempotent).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  COLLECTIONS  (series / bodies of work)
-- ---------------------------------------------------------------------
create table if not exists public.collections (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,
  description   text,
  cover_image_url text,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------
--  ARTWORKS
-- ---------------------------------------------------------------------
create table if not exists public.artworks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  collection_id   uuid references public.collections(id) on delete set null,
  medium          text,
  dimensions      text,                 -- free text e.g. "36 x 48 in"
  width_in        numeric,              -- numeric for size filtering
  height_in       numeric,
  year            int,
  price           numeric,
  currency        text default 'USD',
  availability    text default 'available'
                    check (availability in ('available','reserved','sold')),
  status          text default 'draft'
                    check (status in ('draft','published')),
  description     text,
  story           text,
  inspiration     text,
  category        text,
  subject         text,                 -- abstract / landscape / portrait ...
  framed          boolean default false,
  inventory_number text,
  location        text,                 -- studio / on loan / gallery ...
  tags            text[] default '{}',
  color_palette   text[] default '{}',  -- ['Red','Gold',...] for filtering
  video_url       text,
  primary_image_url text,
  views           int default 0,
  sort_order      int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------------------------------------------------------------------
--  IMAGES  (multiple photos + detail close-ups per work)
-- ---------------------------------------------------------------------
create table if not exists public.artwork_images (
  id           uuid primary key default gen_random_uuid(),
  artwork_id   uuid not null references public.artworks(id) on delete cascade,
  url          text not null,
  storage_path text,
  caption      text,
  is_primary   boolean default false,
  is_detail    boolean default false,   -- true = detail close-up
  sort_order   int default 0,
  created_at   timestamptz default now()
);

create index if not exists idx_artworks_collection on public.artworks(collection_id);
create index if not exists idx_artworks_status     on public.artworks(status);
create index if not exists idx_images_artwork      on public.artwork_images(artwork_id);

-- ---------------------------------------------------------------------
--  updated_at auto-touch
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_artworks_touch on public.artworks;
create trigger trg_artworks_touch
  before update on public.artworks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
--  Public view counter (anon-safe via SECURITY DEFINER — does NOT
--  open the table to anonymous UPDATE)
-- ---------------------------------------------------------------------
create or replace function public.increment_artwork_views(art_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.artworks set views = views + 1
   where id = art_id and status = 'published';
end; $$;
grant execute on function public.increment_artwork_views(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
--  Row Level Security
--    public (anon): read PUBLISHED works + their images + collections
--    artist (authenticated): full read/write on everything
-- ---------------------------------------------------------------------
alter table public.collections     enable row level security;
alter table public.artworks        enable row level security;
alter table public.artwork_images  enable row level security;

drop policy if exists collections_read  on public.collections;
create policy collections_read  on public.collections for select using (true);
drop policy if exists collections_write on public.collections;
create policy collections_write on public.collections for all to authenticated
  using (true) with check (true);

drop policy if exists artworks_read_pub on public.artworks;
create policy artworks_read_pub on public.artworks for select
  using (status = 'published');
drop policy if exists artworks_auth_all on public.artworks;
create policy artworks_auth_all on public.artworks for all to authenticated
  using (true) with check (true);

drop policy if exists images_read_pub on public.artwork_images;
create policy images_read_pub on public.artwork_images for select using (
  exists (select 1 from public.artworks a
           where a.id = artwork_id and a.status = 'published')
);
drop policy if exists images_auth_all on public.artwork_images;
create policy images_auth_all on public.artwork_images for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------
--  Storage bucket for images  (public read, artist writes)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('artwork','artwork', true)
on conflict (id) do nothing;

drop policy if exists artwork_public_read on storage.objects;
create policy artwork_public_read on storage.objects for select
  using (bucket_id = 'artwork');
drop policy if exists artwork_auth_write on storage.objects;
create policy artwork_auth_write on storage.objects for insert to authenticated
  with check (bucket_id = 'artwork');
drop policy if exists artwork_auth_update on storage.objects;
create policy artwork_auth_update on storage.objects for update to authenticated
  using (bucket_id = 'artwork');
drop policy if exists artwork_auth_delete on storage.objects;
create policy artwork_auth_delete on storage.objects for delete to authenticated
  using (bucket_id = 'artwork');

-- Done. Next: create your wife's login under Authentication → Users → Add user.
