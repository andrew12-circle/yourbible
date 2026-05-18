alter table public.profiles
  add column if not exists all_entries_cover_kind text not null default 'none'
    check (all_entries_cover_kind in ('none', 'photo')),
  add column if not exists all_entries_cover_value text,
  add column if not exists all_entries_cover_focal_x real not null default 50
    check (all_entries_cover_focal_x >= 0 and all_entries_cover_focal_x <= 100),
  add column if not exists all_entries_cover_focal_y real not null default 50
    check (all_entries_cover_focal_y >= 0 and all_entries_cover_focal_y <= 100);

comment on column public.profiles.all_entries_cover_kind is 'All Entries banner: none (gradient) or photo.';
comment on column public.profiles.all_entries_cover_value is 'Storage path in journal-photos when kind is photo.';
comment on column public.profiles.all_entries_cover_focal_x is 'Horizontal focal point for All Entries cover (0–100).';
comment on column public.profiles.all_entries_cover_focal_y is 'Vertical focal point for All Entries cover (0–100).';