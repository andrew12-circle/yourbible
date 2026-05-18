-- Focal point for journal cover photos (object-position percentages, 0–100).
alter table public.journals
  add column if not exists cover_focal_x real not null default 50
    check (cover_focal_x >= 0 and cover_focal_x <= 100),
  add column if not exists cover_focal_y real not null default 50
    check (cover_focal_y >= 0 and cover_focal_y <= 100);

comment on column public.journals.cover_focal_x is 'Horizontal focal point for cover photo crop (0=left, 100=right).';
comment on column public.journals.cover_focal_y is 'Vertical focal point for cover photo crop (0=top, 100=bottom).';
